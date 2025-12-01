import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics for comparison
const robynResponseTime = new Trend('robyn_response_time');
const fastApiResponseTime = new Trend('fastapi_response_time');
const robynErrorRate = new Rate('robyn_error_rate');
const fastApiErrorRate = new Rate('fastapi_error_rate');
const robynRequests = new Counter('robyn_requests');
const fastApiRequests = new Counter('fastapi_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 10 }, // Stay at 10 users
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 50 }, // Stay at 50 users
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '2m', target: 100 }, // Stay at 100 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.05'], // Error rate should be less than 5%
    robyn_response_time: ['p(95)<500'],
    fastapi_response_time: ['p(95)<500'],
    robyn_error_rate: ['rate<0.05'],
    fastapi_error_rate: ['rate<0.05'],
  },
};

// API endpoints
const ROBYN_BASE_URL = 'http://localhost:8080';
const FASTAPI_BASE_URL = 'http://localhost:8000';

export default function () {
  group('Robyn API Test', () => {
    testRobynAPI();
  });

  group('FastAPI Test', () => {
    testFastAPI();
  });

  sleep(1); // Wait 1 second between iterations
}

function testRobynAPI() {
  const params = {
    timeout: '30s',
  };

  group('Robyn - Hello World', () => {
    const response = http.get(`${ROBYN_BASE_URL}/`, params);
    const success = check(response, {
      'Robyn status is 200': (r) => r.status === 200,
      'Robyn response is Hello World!': (r) => r.body && r.body.includes('Hello World!'),
      'Robyn response time < 500ms': (r) => r.timings.duration < 500,
    });

    robynResponseTime.add(response.timings.duration);
    robynErrorRate.add(!success);
    robynRequests.add(1);

    if (!success) {
      console.log(`Robyn Error: Status ${response.status}, Body: ${response.body}`);
    }
  });
}

function testFastAPI() {
  const params = {
    timeout: '30s',
  };

  group('FastAPI - Hello World', () => {
    const response = http.get(`${FASTAPI_BASE_URL}/`, params);
    const success = check(response, {
      'FastAPI status is 200': (r) => r.status === 200,
      'FastAPI response is Hello World!': (r) => r.body && r.body.includes('Hello World!'),
      'FastAPI response time < 500ms': (r) => r.timings.duration < 500,
    });

    fastApiResponseTime.add(response.timings.duration);
    fastApiErrorRate.add(!success);
    fastApiRequests.add(1);

    if (!success) {
      console.log(`FastAPI Error: Status ${response.status}, Body: ${response.body}`);
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
  console.log('\nRobyn API (Port 8080):');
  console.log(`  Average Response Time: ${robynStats.avg_response_time.toFixed(2)}ms`);
  console.log(`  95th Percentile: ${robynStats.p95_response_time.toFixed(2)}ms`);
  console.log(`  Error Rate: ${(robynStats.error_rate * 100).toFixed(2)}%`);
  console.log(`  Total Requests: ${robynStats.total_requests}`);

  console.log('\nFastAPI (Port 8000):');
  console.log(`  Average Response Time: ${fastApiStats.avg_response_time.toFixed(2)}ms`);
  console.log(`  95th Percentile: ${fastApiStats.p95_response_time.toFixed(2)}ms`);
  console.log(`  Error Rate: ${(fastApiStats.error_rate * 100).toFixed(2)}%`);
  console.log(`  Total Requests: ${fastApiStats.total_requests}`);

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
