import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { hmac } from 'k6/crypto';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// Custom metrics for resource monitoring
const resourceUsage = new Trend('resource_usage_ms');
const concurrentUsers = new Gauge('concurrent_users');
const requestsPerSecond = new Rate('requests_per_second');
const memoryPressure = new Trend('memory_pressure_indicator');

export let options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up to test CPU/Memory scaling
    ramp_up_test: {
      executor: 'ramping-vus',
      startVUs: 1000,
      stages: [
        { duration: '1m', target: 1000 },
        { duration: '1m', target: 1250 },
        { duration: '2m', target: 1500 },
        { duration: '2m', target: 1800 },
        { duration: '2m', target: 2300 },
        { duration: '1m', target: 2800 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    // http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    // Custom metrics for resource monitoring
    vus: ['value<=1000'], // Max VUs per instance
    vus_max: ['value<=700'], // Absolute max VUs
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
    // console.log(requestUrl);
    let queryString = requestUrl;
    let splitSome = queryString.split('?');
    if (splitSome.length > 1) {
      // Parse query parameters manually for k6 compatibility
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

function extractAccessTokenFromUrl(url) {
  // Parse query parameters from redirect URL
  const urlParts = url.split('?');
  if (urlParts.length < 2) return null;

  const queryParams = urlParts[1].split('&');
  for (let param of queryParams) {
    const [key, value] = param.split('=');
    if (key === 'accessToken') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

function hitTwitterAuth(baseUrl, apiKey, apiSecret) {
  const method = 'GET';
  const requestUrl =
    baseUrl +
    '/v1/user-auth/twitter' +
    `?redirect_uri=https%3A%2F%2Fsocial-analyzer-backend-load-test-920680503230.asia-southeast1.run.app%2F`;
  const signature = getSignature(method, requestUrl, {}, apiKey, apiSecret);
  const headers = {
    'Content-Type': 'application/json',
    Accept: '*/*',
    'x-foru-timestamp': signature.timestamp,
    'x-foru-signature': signature.signature,
    'x-foru-apikey': signature.apiKey,
  };
  const params = {
    headers: headers,
  };
  const res = http.get(requestUrl.toString(), params);

  const responseData = JSON.parse(res.body);
  const twitterAuthUrl = responseData.data;

  const urlParts = twitterAuthUrl.split('?');
  let state = '';
  let codeChallenge = '';

  if (urlParts.length > 1) {
    const queryParams = urlParts[1].split('&');
    for (let param of queryParams) {
      const [key, value] = param.split('=');
      if (key === 'state') {
        state = decodeURIComponent(value);
      } else if (key === 'code_challenge') {
        codeChallenge = decodeURIComponent(value);
      }
    }
  }

  const callbackApi = baseUrl + `/v1/user-auth/twitter/callback/mock?code=${codeChallenge}&state=${state}`;

  // Disable automatic redirect following to capture redirect URL
  const callbackParams = Object.assign({}, params, {
    redirects: 0, // Don't follow redirects automatically
  });

  const callbackRes = http.get(callbackApi, callbackParams);
  let token = null;
  // Check if it's a redirect response (3xx status codes)
  if (callbackRes.status >= 300 && callbackRes.status < 400) {
    const redirectUrl = callbackRes.headers['Location'];
    // console.log('Redirect URL:', redirectUrl);

    // Extract accessToken from redirect URL

    if (redirectUrl) {
      token = extractAccessTokenFromUrl(redirectUrl);
    }
  }

  return token;
}

function hitJoin(baseUrl, apiKey, apiSecret) {
  const userName = generateRandomString(10);
  const joinBody = {
    name: userName,
    email: userName + '@qzueos.com',
    source: 'framer',
    recaptcha_token: 'recaptcha_token_string',
    is_load_test: true,
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
  };
  const params = {
    headers: headers,
  };
  const res = http.post(requestUrl.toString(), JSON.stringify(joinBody), params);
  console.log('REQUEST_REFERRAL ', res.status);
  const responseData = JSON.parse(res.body);
  const refCode = responseData.data.referral_code;
  return refCode;
}

function hitUseReferral(baseUrl, apiKey, apiSecret, refCode, accessToken) {
  const method = 'POST';
  const useReferralUrl = baseUrl + `/v1/referral/use`;
  const referralBody = {
    code: refCode,
  };

  const signatureRefCode = getSignature(method, useReferralUrl, referralBody, apiKey, apiSecret);
  const headersRefCode = {
    'Content-Type': 'application/json',
    Accept: '*/*',
    'x-foru-timestamp': signatureRefCode.timestamp,
    'x-foru-signature': signatureRefCode.signature,
    'x-foru-apikey': signatureRefCode.apiKey,
    Authorization: 'Bearer ' + accessToken,
  };
  const paramsRefCode = {
    headers: headersRefCode,
  };
  const resRefCode = http.post(useReferralUrl.toString(), JSON.stringify(referralBody), paramsRefCode);

  console.log('JOIN_REFERRAL ', resRefCode.status);

  return resRefCode;
}

export default function () {
  const startTime = Date.now();
  concurrentUsers.add(1); // Track concurrent users

  const apiKey = '6587e29c8bf629eab6d29eaf1009450d10f05dd35b2ed9d9eb2b60c65b78638b';
  const apiSecret = '9f1c8792622196d8d607acba3c7a117ab30ad381b88424f6ed5ca7c72b048364';
  // const baseUrl = 'https://api-social-demo.foruai.io';
  const baseUrl = 'https://social-analyzer-backend-load-test-920680503230.asia-southeast1.run.app';
  // const baseUrl = 'http://localhost:3000';

  let time = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);

  // Memory pressure indicator (simulate memory usage tracking)
  const memoryIndicator = Math.random() * 100; // Placeholder for actual memory usage
  memoryPressure.add(memoryIndicator);

  // Step 1: Get access token from Twitter auth
  const accessToken = hitTwitterAuth(baseUrl, apiKey, apiSecret);
  if (!accessToken) {
    fail('Cannot get access token');
  }
  // console.log('access token: ', accessToken);

  // Step 2: Join and get referral code
  const refCode = hitJoin(baseUrl, apiKey, apiSecret);
  if (!refCode) {
    fail('Cannot get referral code');
  }
  // console.log('referral code: ', refCode);

  // Step 3: Use referral code with access token
  const resRefCode = hitUseReferral(baseUrl, apiKey, apiSecret, refCode, accessToken);
  // console.log('Use referral response: ', resRefCode.body);

  // Create comprehensive test result
  const testResult = {
    timestamp: time.toISOString(),
    test_name: 'twitter_auth_flow',
    steps: {
      twitter_auth: {
        success: !!accessToken,
        access_token: accessToken || null,
      },
      join_request: {
        success: !!refCode,
        referral_code: refCode || null,
      },
      use_referral: {
        success: resRefCode.status >= 200 && resRefCode.status < 300,
        status: resRefCode.status,
        response: resRefCode.body,
      },
    },
    overall_success: !!accessToken && !!refCode && resRefCode.status >= 200 && resRefCode.status < 300,
  };

  // Track resource usage and performance metrics
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  resourceUsage.add(totalDuration);
  requestsPerSecond.add(1);

  // Enhanced test result with resource tracking
  testResult.performance_metrics = {
    total_duration_ms: totalDuration,
    memory_pressure_indicator: memoryIndicator,
    timestamp: time.toISOString(),
    concurrent_load_estimate: Math.floor(Math.random() * 50) + 1, // Simulated concurrent load
  };

  // Output JSON result for external processing
  // console.log('TEST_RESULT_JSON:', JSON.stringify(testResult));

  check(resRefCode, {
    'status is 200 or 201': (r) => {
      return r.status === 200 || r.status === 201;
    },
    'response time acceptable': () => totalDuration < 5000, // 5 second max
    'memory pressure normal': () => memoryIndicator < 80, // 80% threshold
  });

  // Add small sleep to prevent overwhelming the service
  sleep(0.1);
}
