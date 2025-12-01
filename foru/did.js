import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { hmac } from 'k6/crypto';
import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';
// Custom metrics
let errorRateLogin = new Rate('errors_login');
let responseTrendLogin = new Trend('response_time_login');
let errorRateCreateDid = new Rate('errors_create_did');
let responseTrendCreateDid = new Trend('response_time_create_did');
let concurrentUsersTrend = new Trend('concurrent_users');
export let options = {
    scenarios: {
        constant_request_rate: {
            executor: 'per-vu-iterations',
            vus: 10,
            iterations: 25,
            maxDuration: '0.5m',
        },
    },
    // stages: [
    //     { duration: '1m', target: 550 },   // Ramp-up to 500 users
    // ],
    // thresholds: {
    //     'response_time_login': ['p(95)<5000'], // 95% of requests should be below 10000ms
    //     'http_req_duration': ['p(95)<5000'], // 95% of requests should be below 5000ms
    //     'response_time_create_did': ['p(95)<100000'], // 95% of requests should be below 10000ms
    // },
};
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
export default function () {
    concurrentUsersTrend.add(__VU);
    const randomId = getRandomInt(10000);
    const apiKey = 'cf0f454d84a2b4e401be6b6875d7df80fd1c7eb2f7074248405802a78f865a7f';
    const apiSecret = '6fe03bca62ca40e1db93bab46fe70b5e2e63b6c828238103c7252d51c405a2a0';
    const baseUrl = 'https://api-dev.foruai.io';
    // const baseUrl = 'https://api-demo.foruai.io';
    // const baseUrl = 'http://localhost:8000';
    const url = `${baseUrl}/v1/auth/user/test-at`;
    const body = {
        id: randomId,
    };
    const method = 'POST';
    const requestUrl = new URL(url);
    const signature = getSignature(method, requestUrl, body, apiKey, apiSecret);
    const headers = {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'x-foru-timestamp': signature.timestamp,
        'x-foru-signature': signature.signature,
        'x-foru-apikey': signature.apiKey
    };
    const params = {
        headers: headers,
    };
    const response = http.post(url, JSON.stringify(body), params);
    let responseTime = response.timings.duration;
    responseTrendLogin.add(responseTime);
    let success = check(response, {
        'status is 200': (r) => r.status === 201 || r.status === 200,
    });
    errorRateLogin.add(!success);
    if (!success) {
        console.log(`Error occurred at login ${__VU} concurrent users. Response time: ${responseTime}ms`);
    }
    console.log(`Current concurrent login users is ${__VU}`);
    if (success) {
        const url = `${baseUrl}/v1/user-decentralized-identity`;
        const token = response.json().data.accessToken;
        const body ={
            chain_id: 1329,
            publish_other_chain: false
        };
        const method = 'POST';
        const requestUrl = new URL(url);
        const signature = getSignature(method, requestUrl, body, apiKey, apiSecret);
        const headers = {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'x-foru-timestamp': signature.timestamp,
            'x-foru-signature': signature.signature,
            'x-foru-apikey': signature.apiKey,
        };
        const params = {
            headers: headers,
        };
        console.log(`Current login user id is ${randomId}`);
        const response1 = http.post(url, JSON.stringify(body), params);
        let responseTime = response1.timings.duration;
        responseTrendCreateDid.add(responseTime);
        let success = check(response1, {
            'status is 200': (r) => r.status === 201 || r.status === 200,
        });
        errorRateCreateDid.add(!success);
        if (success) {
            console.log('success create did: ', response1.json().data.did);
            console.log(`Current concurrent create did users is ${__VU}`);
        }
        if (!success) {
            console.log(response1.json().message);
            console.log(`Error occurred at create did ${__VU} concurrent users. Response time: ${responseTime}ms`);
        }
    }
    sleep(1);
}
function getSignature(method, requestUrl, requestBody, apiKey, apiSecret) {
    const timestamp = new Date().getTime().toString();
    let payload = undefined;
    if (method === 'GET'){
        payload = {};
        requestUrl.query.each((param) => {
            payload[param.key] = param.value;
        });
    } else {
        payload = requestBody
    }
    payload.timestamp = timestamp;
    payload = typeof payload != 'string' ? JSON.stringify(payload) : payload;
    var signature = hmac('sha256', apiSecret, payload, 'hex');
    return {
        timestamp,
        signature,
        apiKey
    }
}
export function handleSummary(data) {
    let maxSuccessfulUsers = 0;
    let bestResponseTime = Infinity;
    let worstResponseTime = 0;
    for (let metric in data.metrics) {
        if (metric.startsWith('concurrent_users')) {
            maxSuccessfulUsers = Math.max(maxSuccessfulUsers, data.metrics[metric].values.max);
        } else if (metric.startsWith('response_time')) {
            bestResponseTime = Math.min(bestResponseTime, data.metrics[metric].values.min);
            worstResponseTime = Math.max(worstResponseTime, data.metrics[metric].values.max);
        }
    }
    return {
        'stdout': JSON.stringify({
            maxConcurrentUsers: maxSuccessfulUsers,
            bestResponseTime: bestResponseTime,
            worstResponseTime: worstResponseTime,
            errorLoginRate: data.metrics.errors_login.values.rate,
            errorCreateDidRate: data.metrics.errors_create_did.values.rate,
            avgResponseTimeLogin: data.metrics.response_time_login.values.avg,
            medianResponseTimeLogin: data.metrics.response_time_login.values.med,
            p95ResponseTimeLogin: data.metrics.response_time_login.values['p(95)'],
            p99ResponseTimeLogin: data.metrics.response_time_login.values['p(99)'],
            avgResponseTimeCreateDid: data.metrics.response_time_create_did.values.avg,
            medianResponseTimeCreateDid: data.metrics.response_time_create_did.values.med,
            p95ResponseTimeCreateDid: data.metrics.response_time_create_did.values['p(95)'],
            p99ResponseTimeCreateDid: data.metrics.response_time_create_did.values['p(99)']
        }, null, 2)
    };
}