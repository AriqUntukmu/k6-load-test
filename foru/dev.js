import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { hmac } from 'k6/crypto';
import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';

const token = ""

export let options = {
    scenarios:{
        constant_rps: {
            executor: 'constant-arrival-rate',
            rate: 10,
            timeUnit: '1.5s',
            duration: '1m',
            preAllocatedVUs: 10, 
            maxVUs: 50,        
        },
    }
};

function getSignature(method, requestUrl, requestBody, apiKey, apiSecret) {
    const timestamp = new Date().getTime().toString();
    let payload = undefined;
    if (method === 'GET'){
        console.log(requestUrl);
        let queryString = requestUrl;
        let splitSome = queryString.split('?');
        const urlSearchParams = new URLSearchParams(splitSome[1]);
        payload = Object.fromEntries(urlSearchParams.entries());
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

export default function () {
    const apiKey = 'cf0f454d84a2b4e401be6b6875d7df80fd1c7eb2f7074248405802a78f865a7f';
    const apiSecret = '6fe03bca62ca40e1db93bab46fe70b5e2e63b6c828238103c7252d51c405a2a0';
    const baseUrl = 'https://api-dev.foruai.io';
    // const baseUrl = 'http://localhost:8000';
    // const url = `${baseUrl}/v1/auth/user/test-at`;
    const body = {
        // id: randomId,
    };
    const method = 'GET';
    const requestUrl = baseUrl + '/v1/community/public/list?page=1&limit=30&chain_id=1328&sort_by=did';
    // const requestUrl = new URL(baseUrl + '/v1/community/public/list');
    // requestUrl.searchParams.append('page', '1');
    // requestUrl.searchParams.append('limit', '15');
    // requestUrl.searchParams.append('chain_id', '50312');
    // requestUrl.searchParams.append('sort_by', 'did');

    const signature = getSignature(method, requestUrl, {}, apiKey, apiSecret);
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
    const res = http.get(requestUrl.toString(), params);
    let time = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));

    check(res, {
        'status is 200 or 201': (r) => {
            console.log(JSON.stringify({
                status: r.status,
                time: time.toISOString(),
                // response: r.body
            }));
            return r.status === 200 || r.status === 201;
        }
    });
}
