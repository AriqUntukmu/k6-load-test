import http, { head } from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus:500,
  // duration: '1s'
  iterations: 500,
};

export default function() {
  const domain = "https://foru-ai-service-demo-maeufmvgvq-as.a.run.app"
  const payload = {"dogs": "$DOGS is coming to town! but what kind of DOG are you? According to your data, you are a spirited and lively Norwegian Elkhound. This breed is known for its sociable and friendly disposition, which resonates with your playful and supportive tweets. Just like a Norwegian Elkhound thrives in a community, you flourish in connecting with others and lifting their spirits. Join us in the $DOGS community and let’s celebrate these wonderful traits together! #DOGS"}

  const headers =  {
    'Content-Type': 'application/json',
    'accept': '*/*'
  }

  // console.log(payload);

  const response = http.post(domain + '/avatar-dog-detection', JSON.stringify(payload), {
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
