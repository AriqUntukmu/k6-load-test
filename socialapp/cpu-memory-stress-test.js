import http from 'k6/http';
import { check, sleep } from 'k6';
import { hmac } from 'k6/crypto';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// Custom metrics for detailed resource monitoring
const cpuIntensiveOps = new Counter('cpu_intensive_operations');
const memoryAllocations = new Counter('memory_allocations');
const concurrentConnections = new Gauge('concurrent_connections');
const responseTimeByLoad = new Trend('response_time_by_load');

export let options = {
  scenarios: {
    // CPU Stress Test - High computation load
    cpu_stress_test: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '1m', target: 100 }, // Ramp up
        { duration: '2m', target: 200 }, // Medium CPU load
        { duration: '3m', target: 400 }, // High CPU load
        { duration: '2m', target: 600 }, // Peak CPU load
        { duration: '1m', target: 300 }, // Cool down
        { duration: '1m', target: 0 }, // Complete stop
      ],
    },

    // Memory Stress Test - Large payload processing
    memory_stress_test: {
      executor: 'constant-vus',
      vus: 300,
      duration: '8m',
      startTime: '11m', // Start after CPU test
    },

    // Combined Stress Test - Both CPU and Memory
    combined_stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 200 }, // 200 RPS
        { duration: '3m', target: 500 }, // 500 RPS
        { duration: '3m', target: 800 }, // 800 RPS - near 1000 concurrent limit
        { duration: '2m', target: 200 }, // Cool down
      ],
      preAllocatedVUs: 200,
      maxVUs: 1000,
      startTime: '20m', // Start after memory test
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'], // Allow slightly higher error rate for stress test
    http_req_duration: ['p(95)<3000', 'p(99)<8000'], // More lenient for stress testing
    http_req_rate: ['rate>50'], // Minimum throughput
    concurrent_connections: ['value<=1000'], // Cloud Run limit
    cpu_intensive_operations: ['count>1000'], // Ensure CPU load
    memory_allocations: ['count>500'], // Ensure memory pressure
  },
};

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function getSignature(method, requestUrl, requestBody, apiKey, apiSecret) {
  const timestamp = new Date().getTime().toString();
  let payload = undefined;

  if (method === 'GET') {
    let queryString = requestUrl;
    let splitSome = queryString.split('?');
    if (splitSome.length > 1) {
      payload = {};
      const queryParams = splitSome[1].split('&');
      for (let param of queryParams) {
        const [key, value] = param.split('=');
        if (key) {
          payload[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
        }
      }
    } else {
      payload = {};
    }
  } else {
    payload = requestBody;
  }

  payload.timestamp = timestamp;
  payload = typeof payload != 'string' ? JSON.stringify(payload) : payload;

  var signature = hmac('sha256', apiSecret, payload, 'hex');

  return {
    timestamp,
    signature,
    apiKey,
  };
}

// CPU-intensive operation to stress test CPU usage
function cpuIntensiveTask() {
  cpuIntensiveOps.add(1);

  // Simulate CPU-intensive cryptographic operations
  let result = '';
  for (let i = 0; i < 1000; i++) {
    result = hmac('sha256', 'stress-test-key', `data-${i}-${Math.random()}`, 'hex');
  }

  // Additional CPU load - string manipulations
  for (let i = 0; i < 500; i++) {
    result += generateRandomString(50);
    result = result.substring(0, 1000); // Prevent unlimited growth
  }

  return result;
}

// Memory-intensive operation to stress test memory usage
function memoryIntensiveTask() {
  memoryAllocations.add(1);

  // Create large objects to simulate memory pressure
  const largeArray = [];
  for (let i = 0; i < 1000; i++) {
    largeArray.push({
      id: i,
      data: generateRandomString(1000),
      timestamp: new Date().toISOString(),
      metadata: {
        processed: false,
        priority: Math.random(),
        tags: Array(10)
          .fill()
          .map(() => generateRandomString(20)),
      },
    });
  }

  // Process the array (CPU + Memory usage)
  return largeArray
    .filter((item) => item.metadata.priority > 0.5)
    .map((item) => ({ ...item, processed: true }))
    .slice(0, 100); // Keep only subset to manage memory
}

export default function () {
  const startTime = Date.now();
  concurrentConnections.add(1);

  const apiKey = '6587e29c8bf629eab6d29eaf1009450d10f05dd35b2ed9d9eb2b60c65b78638b';
  const apiSecret = '9f1c8792622196d8d607acba3c7a117ab30ad381b88424f6ed5ca7c72b048364';
  const baseUrl = 'https://social-analyzer-backend-load-test-920680503230.asia-southeast1.run.app';

  // Perform CPU-intensive operations
  const cpuResult = cpuIntensiveTask();

  // Perform memory-intensive operations
  const memoryResult = memoryIntensiveTask();

  // Make HTTP request with enhanced payload
  const userName = generateRandomString(15);
  const joinBody = {
    name: userName,
    email: userName + '@stress-test.com',
    source: 'load-test',
    recaptcha_token: 'stress_test_token_' + generateRandomString(50),
    is_load_test: true,
    stress_test_data: {
      cpu_result_hash: cpuResult.substring(0, 64),
      memory_objects_count: memoryResult.length,
      test_timestamp: new Date().toISOString(),
      load_level: Math.floor(Math.random() * 10) + 1,
    },
  };

  const method = 'POST';
  const requestUrl = baseUrl + '/v1/join/request';
  const signature = getSignature(method, requestUrl, joinBody, apiKey, apiSecret);

  const headers = {
    'Content-Type': 'application/json',
    Accept: '*/*',
    'x-foru-timestamp': signature.timestamp,
    'x-foru-signature': signature.signature,
    'x-foru-apikey': signature.apiKey,
    'x-stress-test': 'true',
    'x-load-level': joinBody.stress_test_data.load_level.toString(),
  };

  const res = http.post(requestUrl, JSON.stringify(joinBody), { headers });

  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  responseTimeByLoad.add(totalDuration);

  // Resource usage summary
  const resourceSummary = {
    timestamp: new Date().toISOString(),
    test_type: 'stress_test',
    duration_ms: totalDuration,
    cpu_operations: 1500, // 1000 + 500 operations
    memory_objects: memoryResult.length,
    response_status: res.status,
    estimated_cpu_usage: Math.min(100, totalDuration / 10), // Rough estimate
    estimated_memory_mb: Math.min(512, memoryResult.length * 0.1), // Rough estimate
  };

  console.log('STRESS_TEST_RESULT:', JSON.stringify(resourceSummary));

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response time under 8s': () => totalDuration < 8000,
    'cpu operations completed': () => cpuResult.length > 0,
    'memory operations completed': () => memoryResult.length > 0,
  });

  // Variable sleep based on load to simulate realistic usage
  const sleepTime = Math.random() * 0.5 + 0.1; // 0.1 to 0.6 seconds
  sleep(sleepTime);
}
