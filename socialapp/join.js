import http from 'k6/http';
import { check, sleep } from 'k6';
import { hmac } from 'k6/crypto';

export let options = {
  //   vus: 1,
  //   iterations: 1,
  scenarios: {
    constant_rps: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '10s', // 1000 requests at 100 RPS = 10 seconds
      preAllocatedVUs: 50,
      maxVUs: 50,
    },
  },
};
function getSignature(method, requestUrl, requestBody, apiKey, apiSecret) {
  const timestamp = new Date().getTime().toString();
  let payload = undefined;

  if (method === 'GET') {
    console.log(requestUrl);
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

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Example usage:
const randomString = generateRandomString(10); // Generates a 10-character random string

export default function () {
  const apiKey = '6587e29c8bf629eab6d29eaf1009450d10f05dd35b2ed9d9eb2b60c65b78638b';
  const apiSecret = '9f1c8792622196d8d607acba3c7a117ab30ad381b88424f6ed5ca7c72b048364';
  //   const baseUrl = 'https://api-social-demo.foruai.io';
  const baseUrl = 'http://localhost:3000';

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

  // Parse the JSON response
  const responseData = JSON.parse(res.body);
  const refCode = responseData.data.referral_code;
  console.log(`name: ${joinBody.name}, email: ${joinBody.email}, referral code: ${refCode}`);

  //use referral
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
  };
  const paramsRefCode = {
    headers: headersRefCode,
  };
  const resRefCode = http.post(useReferralUrl.toString(), JSON.stringify(referralBody), paramsRefCode);
  console.log('use ref code body: ', resRefCode.body);

  let time = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);

  check(res, {
    'status is 200 or 201': (r) => {
      console.log(
        JSON.stringify({
          status: r.status,
          time: time.toISOString(),
          // response: r.body
        }),
      );
      return r.status === 200 || r.status === 201;
    },
  });
}
