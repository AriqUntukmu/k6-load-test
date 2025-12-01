import http, { head } from 'k6/http';
import { check, sleep } from 'k6';

const payload = JSON.parse(open('./payload.json'));
export const options = {
  vus:50,
  // duration: '60s'
  iterations: 50,
};

export default function() {
  const domain = "https://foru-ai-service-demo-maeufmvgvq-as.a.run.app"
  // const domain = "http://localhost:8080"

  const headers =  {
    'Content-Type': 'application/json',
    'accept': '*/*'
  }

  // console.log(payload);

  const response = http.post(domain + '/avatar-openai', JSON.stringify(payload), {
    headers: headers
  })


  check(response, {
  'status is 200': (r) => {
    let time = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
    console.log({status: r.status, date: time.toISOString()});
    return r.status === 200
    }
  });

  // sleep(0.1);
}
