import http from 'k6/http';
import { check, sleep } from 'k6';

const config = JSON.parse(open('../4u-config.json'));

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
    const url = 'https://api-demo.foruai.io/v2/missions/uncompleted';
    const headers =  {
        "Authorization": 'Bearer ' + config.token,
        'Content-Type': 'application/json',
        "x-foru-apikey": config.apikey,
        'x-foru-timestamp': 1728885580548,
        'x-foru-signature': 'a1fe1433cb84f71ad945f3f6112961becf67d35090e244d7c90bb5781c5fcc8d',
        'accept': '*/*'
    }

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
