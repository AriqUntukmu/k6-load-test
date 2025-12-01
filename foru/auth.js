import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    vus: 1,
    iterations: 1
    // stages: [
    //     { duration: '1m', target: 4000 },
    //     // { duration: '5m', target: 10000 }, 
    //     // { duration: '10m', target: 100000 },  
    // ],
    // scenarios:{
    //     constant_rps: {
    //         executor: 'constant-arrival-rate',
    //         rate: 1000,
    //         timeUnit: '1s',
    //         duration: '1m',
    //         preAllocatedVUs: 1000,
    //         maxVUs: 1000,
    //     },
    // }
};

export default function () {
    const url = 'https://api.foruai.io/v1/telegram/miniapp/auth?user=%7B%22id%22%3A6563151773%2C%22first_name%22%3A%22iT%27x%22%2C%22last_name%22%3A%22ALi%22%2C%22username%22%3A%22aliraza878%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%7D&chat_instance=-2401795224264127121&chat_type=sender&start_param=PARTNER-BLUM&auth_date=1726848347&hash=74b149cc5ed638e0f1d6a76694e9ffc0e2d1e057733d66a5fe44f1fce43d222e';

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
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
