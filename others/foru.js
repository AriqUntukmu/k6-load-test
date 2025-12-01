import http, { head } from 'k6/http';
import { check, sleep } from 'k6';
import { __ITER } from 'k6/execution';

const config = JSON.parse(open('./4u-config.json'));
export const options = {
  vus: 50,
  iterations: 50
  // duration: '120s',
};

// The function that defines VU logic.
//
// See https://grafana.com/docs/k6/latest/examples/get-started-with-k6/ to learn more
// about authoring k6 scripts.
//

export default function() {
  const domain = config.domain;

  const headers =  {
    "Authorization": 'Bearer ' + config.token,
    'Content-Type': 'application/json',
    "x-foru-apikey": config.apikey,
    'x-foru-timestamp': config.timestamp,
    'x-foru-signature': config.signature,
    'accept': '*/*'
}

  // const response = http.get(domain + 'v2/missions/uncompleted', {
  //   headers: headers
  // })
  //   check(response, {
  //   'status is 200': (r) => {
  //     console.log({status: r.status});
  //     return r.status === 200
  //   }
  // });


  const response = http.post(domain + 'v1/shake/process', null, {
    headers: headers
  })

  let time = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));


    check(response, {
    'status is 201': (r) => {
      console.log({status: r.status, time: time.toISOString()});
      return r.status === 201
    }
  });

  // sleep(1)
}
