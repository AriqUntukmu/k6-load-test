import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { hmac } from 'k6/crypto';
import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';

const token = ""

export let options = {
    scenarios:{
        constant_request_rate: {
            executor: 'per-vu-iterations',
            vus: 2,
            iterations: 2,
        },
    }
};


export default function () {
    const body = {};
    const method = 'GET';
    const requestUrl = "https://admin.riuhmerekah.com/api/guests?populate=*&pagination[pageSize]=500&pagination[page]=2"
    const headers = {
        'Content-Type': 'application/json',
        'Accept': '*/*',

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
