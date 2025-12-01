import http from 'k6/http';
import { check, sleep } from 'k6';

const config = JSON.parse(open('../4u-config.json'));
const apiSecret = "6fe03bca62ca40e1db93bab46fe70b5e2e63b6c828238103c7252d51c405a2a0";
const apiKey = "cf0f454d84a2b4e401be6b6875d7df80fd1c7eb2f7074248405802a78f865a7f";

export let options = {
    // vus: 1,
    // iterations: 1
    // stages: [
    //     { duration: '1m', target: 4000 },
    //     // { duration: '5m', target: 10000 }, 
    //     // { duration: '10m', target: 100000 },  
    // ],
    scenarios:{
        constant_rps: {
            executor: 'constant-arrival-rate',
            rate: 800,
            timeUnit: '1s',
            duration: '1m',
            preAllocatedVUs: 800,
            maxVUs: 800,
        },
    }
};

export default function () {
    const url = 'https://api-dev.some.io/v1/quest';

    const headers =  {
        "Authorization": 'Bearer ' + config.token,
        'Content-Type': 'application/json',
        'accept': '*/*'
    }

    const timestamp = new Date().getTime().toString();
    let requestContent = pm.request.headers['Content-Type'];
    let payload = undefined;
    if(pm.request.method === 'GET'){
        payload = {};
        pm.request.url.query.each((param) => {
            payload[param.key] = param.value;
        });
    }else{
        payload = {};
        if (requestContent != 'multipart/form-data') {
            payload = pm.request.body ? JSON.parse(pm.request.body) : pm.request.body;
        }
    }
    payload.timestamp = timestamp;
    payload = JSON.stringify(payload).toString();
    var signature = CryptoJS.HmacSHA256(payload, apiSecret).toString(CryptoJS.enc.Hex);
    headers["x-foru-timestamp"] = timestamp;
    headers["x-foru-signature"] = signature;
    headers["x-foru-apikey"] = apiKey

    const params = {
        headers: headers
    };

    const res = http.get(url, params);
    let time = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));


    check(res, {
    'status is 200': (r) => {
      console.log({status: r.status, time: time.toISOString()});
      return r.status === 200
    }})

    // sleep(1);
}
