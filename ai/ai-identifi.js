import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Load payload data
const payloadData = JSON.parse(open('./payload-identifi.json'));

// Custom metrics for comparison
const robynResponseTime = new Trend('robyn_response_time');
const fastApiResponseTime = new Trend('fastapi_response_time');
const robynErrorRate = new Rate('robyn_error_rate');
const fastApiErrorRate = new Rate('fastapi_error_rate');
const robynRequests = new Counter('robyn_requests');
const fastApiRequests = new Counter('fastapi_requests');
const robynAttempts = new Counter('robyn_attempts');
const fastApiAttempts = new Counter('fastapi_attempts');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '15s', target: 35 },
    { duration: '5s', target: 10 },
    { duration: '2s', target: 5 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95% of requests should be below 10000ms (relaxed for initial testing)
    http_req_failed: ['rate<0.1'], // Error rate should be less than 10% (relaxed for initial testing)
    robyn_response_time: ['p(95)<10000'],
    fastapi_response_time: ['p(95)<10000'],
    robyn_error_rate: ['rate<0.1'],
    fastapi_error_rate: ['rate<0.1'],
  },
};

// API endpoints
const ROBYN_BASE_URL = 'https://ai-reputation-dev-920680503230.asia-southeast1.run.app';
// const ROBYN_BASE_URL = 'http://localhost:8080';
const FASTAPI_BASE_URL = 'https://api-agent-dev-1018404036495.asia-southeast1.run.app';

export default function () {
  group('Robyn API Test', () => {
    testRobynAPI();
  });

  group('FastAPI Test', () => {
    testFastAPI();
  });

  sleep(3); // Wait 3 seconds between iterations to reduce load
}

function testRobynAPI() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '60s',
  };

  group('Robyn - Identity Analysis', () => {
    robynAttempts.add(1);
    console.log(`[${new Date().toISOString()}] Attempting Robyn request...`);
    const response = http.post(`${ROBYN_BASE_URL}/api/identifi/log`, JSON.stringify(payloadData), params);
    console.log(
      `[${new Date().toISOString()}] Robyn response received: Status ${
        response.status
      }, Duration: ${response.timings.duration.toFixed(2)}ms`,
    );

    const checks = check(response, {
      'Robyn status is 200': (r) => r.status === 200,
      'Robyn response has content': (r) => r.body && r.body.length > 0,
      'Robyn response time < 10000ms': (r) => r.timings.duration < 10000,
      'Robyn response is valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
    });

    robynResponseTime.add(response.timings.duration);

    // Only count as error if HTTP status is not 2xx or response is invalid
    const isHttpError = response.status < 200 || response.status >= 300;
    const isInvalidResponse = !response.body || response.body.length === 0;
    let isJsonError = false;
    try {
      JSON.parse(response.body);
    } catch (e) {
      isJsonError = true;
    }

    const actualError = isHttpError || isInvalidResponse || isJsonError;
    robynErrorRate.add(actualError);
    robynRequests.add(1);

    // Only log actual HTTP errors, not performance threshold failures
    if (actualError) {
      console.log(`Robyn Error: Status ${response.status}, Body: ${response.body.substring(0, 200)}...`);
    } else if (response.timings.duration >= 10000) {
      console.log(
        `Robyn Performance Warning: Response time ${response.timings.duration.toFixed(2)}ms (>10s threshold)`,
      );
    }
  });
}

function testFastAPI() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '60s',
  };

  group('FastAPI - Identity Analysis', () => {
    fastApiAttempts.add(1);
    console.log(`[${new Date().toISOString()}] Attempting FastAPI request...`);
    const response = http.post(`${FASTAPI_BASE_URL}/get-identifi-score-log`, JSON.stringify(payloadData), params);
    console.log(
      `[${new Date().toISOString()}] FastAPI response received: Status ${
        response.status
      }, Duration: ${response.timings.duration.toFixed(2)}ms`,
    );

    const checks = check(response, {
      'FastAPI status is 200': (r) => r.status === 200,
      'FastAPI response has content': (r) => r.body && r.body.length > 0,
      'FastAPI response time < 10000ms': (r) => r.timings.duration < 10000,
      'FastAPI response is valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
    });

    fastApiResponseTime.add(response.timings.duration);

    // Only count as error if HTTP status is not 2xx or response is invalid
    const isHttpError = response.status < 200 || response.status >= 300;
    const isInvalidResponse = !response.body || response.body.length === 0;
    let isJsonError = false;
    try {
      JSON.parse(response.body);
    } catch (e) {
      isJsonError = true;
    }

    const actualError = isHttpError || isInvalidResponse || isJsonError;
    fastApiErrorRate.add(actualError);
    fastApiRequests.add(1);

    // Only log actual HTTP errors, not performance threshold failures
    if (actualError) {
      console.log(`FastAPI Error: Status ${response.status}, Body: ${response.body.substring(0, 200)}...`);
    } else if (response.timings.duration >= 10000) {
      console.log(
        `FastAPI Performance Warning: Response time ${response.timings.duration.toFixed(2)}ms (>10s threshold)`,
      );
    }
  });
}

export function handleSummary(data) {
  const robynStats = {
    avg_response_time:
      (data.metrics.robyn_response_time &&
        data.metrics.robyn_response_time.values &&
        data.metrics.robyn_response_time.values.avg) ||
      0,
    p95_response_time:
      (data.metrics.robyn_response_time &&
        data.metrics.robyn_response_time.values &&
        data.metrics.robyn_response_time.values['p(95)']) ||
      0,
    error_rate:
      (data.metrics.robyn_error_rate &&
        data.metrics.robyn_error_rate.values &&
        data.metrics.robyn_error_rate.values.rate) ||
      0,
    total_requests:
      (data.metrics.robyn_requests && data.metrics.robyn_requests.values && data.metrics.robyn_requests.values.count) ||
      0,
    total_attempts:
      (data.metrics.robyn_attempts && data.metrics.robyn_attempts.values && data.metrics.robyn_attempts.values.count) ||
      0,
  };

  const fastApiStats = {
    avg_response_time:
      (data.metrics.fastapi_response_time &&
        data.metrics.fastapi_response_time.values &&
        data.metrics.fastapi_response_time.values.avg) ||
      0,
    p95_response_time:
      (data.metrics.fastapi_response_time &&
        data.metrics.fastapi_response_time.values &&
        data.metrics.fastapi_response_time.values['p(95)']) ||
      0,
    error_rate:
      (data.metrics.fastapi_error_rate &&
        data.metrics.fastapi_error_rate.values &&
        data.metrics.fastapi_error_rate.values.rate) ||
      0,
    total_requests:
      (data.metrics.fastapi_requests &&
        data.metrics.fastapi_requests.values &&
        data.metrics.fastapi_requests.values.count) ||
      0,
    total_attempts:
      (data.metrics.fastapi_attempts &&
        data.metrics.fastapi_attempts.values &&
        data.metrics.fastapi_attempts.values.count) ||
      0,
  };

  const comparison = {
    timestamp: new Date().toISOString(),
    test_duration: data.state.testRunDurationMs,
    robyn_api: robynStats,
    fastapi: fastApiStats,
    winner: {
      avg_response_time: robynStats.avg_response_time < fastApiStats.avg_response_time ? 'Robyn' : 'FastAPI',
      p95_response_time: robynStats.p95_response_time < fastApiStats.p95_response_time ? 'Robyn' : 'FastAPI',
      error_rate: robynStats.error_rate < fastApiStats.error_rate ? 'Robyn' : 'FastAPI',
      throughput: robynStats.total_requests > fastApiStats.total_requests ? 'Robyn' : 'FastAPI',
    },
  };

  console.log('\n=== API PERFORMANCE COMPARISON ===');
  console.log(`Test Duration: ${data.state.testRunDurationMs}ms`);
  console.log('\nRobyn API (Identity Analysis):');
  console.log(`  Average Response Time: ${robynStats.avg_response_time.toFixed(2)}ms`);
  console.log(`  95th Percentile: ${robynStats.p95_response_time.toFixed(2)}ms`);
  console.log(`  Error Rate: ${(robynStats.error_rate * 100).toFixed(2)}%`);
  console.log(`  Total Requests: ${robynStats.total_requests}`);
  console.log(`  Total Attempts: ${robynStats.total_attempts}`);
  console.log(`  Success Rate: ${((robynStats.total_requests / robynStats.total_attempts) * 100).toFixed(2)}%`);

  console.log('\nFastAPI (Identity Analysis):');
  console.log(`  Average Response Time: ${fastApiStats.avg_response_time.toFixed(2)}ms`);
  console.log(`  95th Percentile: ${fastApiStats.p95_response_time.toFixed(2)}ms`);
  console.log(`  Error Rate: ${(fastApiStats.error_rate * 100).toFixed(2)}%`);
  console.log(`  Total Requests: ${fastApiStats.total_requests}`);
  console.log(`  Total Attempts: ${fastApiStats.total_attempts}`);
  console.log(`  Success Rate: ${((fastApiStats.total_requests / fastApiStats.total_attempts) * 100).toFixed(2)}%`);

  console.log('\n=== WINNERS ===');
  console.log(`Average Response Time: ${comparison.winner.avg_response_time}`);
  console.log(`95th Percentile Response Time: ${comparison.winner.p95_response_time}`);
  console.log(`Error Rate: ${comparison.winner.error_rate}`);
  console.log(`Throughput: ${comparison.winner.throughput}`);

  return {
    'comparison-results.json': JSON.stringify(comparison, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
