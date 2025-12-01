import http from 'k6/http';
import { check, sleep } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

export const options = {
  // A number specifying the number of VUs to run concurrently.
  vus: 1,
  // A string specifying the total duration of the test run.
  // duration: '10s',
  iterations: 1,

  // The following section contains configuration options for execution of this
  // test script in Grafana Cloud.
  //
  // See https://grafana.com/docs/grafana-cloud/k6/get-started/run-cloud-tests-from-the-cli/
  // to learn about authoring and running k6 test scripts in Grafana k6 Cloud.
  //
  // ext: {
  //   loadimpact: {
  //     // The ID of the project to which the test is assigned in the k6 Cloud UI.
  //     // By default tests are executed in default project.
  //     projectID: "",
  //     // The name of the test in the k6 Cloud UI.
  //     // Test runs with the same name will be grouped.
  //     name: "script.js"
  //   }
  // },

  // Uncomment this section to enable the use of Browser API in your tests.
  //
  // See https://grafana.com/docs/k6/latest/using-k6-browser/running-browser-tests/ to learn more
  // about using Browser API in your test scripts.
  //
  // scenarios: {
  //   // The scenario name appears in the result summary, tags, and so on.
  //   // You can give the scenario any name, as long as each name in the script is unique.
  //   ui: {
  //     // Executor is a mandatory parameter for browser-based tests.
  //     // Shared iterations in this case tells k6 to reuse VUs to execute iterations.
  //     //
  //     // See https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ for other executor types.
  //     executor: 'shared-iterations',
  //     options: {
  //       browser: {
  //         // This is a mandatory parameter that instructs k6 to launch and
  //         // connect to a chromium-based browser, and use it to run UI-based
  //         // tests.
  //         type: 'chromium',
  //       },
  //     },
  //   },
  // }
};

// The function that defines VU logic.
//
// See https://grafana.com/docs/k6/latest/examples/get-started-with-k6/ to learn more
// about authoring k6 scripts.
//


const imgPath = './hansohee.jpeg';
const payload = new FormData();
const imgFile = open(imgPath, 'b');

const payloadReflection = new FormData();
// const reflectionImagePaths = {
//   hero1: './test1.png',
//   hero2: './ryujin.jpeg',
//   hero3: './riqs.jpg',
//   highlight1: './riqs.jpg',
//   highlight2: './test1.png',
//   bestGift: './ryujin.jpeg',
//   worstGift: './riqs.jpg',
// }

export default function() {
  const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImJlNzgyM2VmMDFiZDRkMmI5NjI3NDE2NThkMjA4MDdlZmVlNmRlNWMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiQXJpcSBGYWNocnkgUmFtYWRoYW4iLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUFjSFR0ZnJ6MjdNYzR6R0dBSnRjVnNQdm9MR21mNXljNjdBWmc3Yl9jV2c5Zz1zOTYtYyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS91bnR1a211LTk0ZGZkIiwiYXVkIjoidW50dWttdS05NGRmZCIsImF1dGhfdGltZSI6MTcwMTE2Mjk5MSwidXNlcl9pZCI6InM1NFRxaEZkQURQNWs4YkNnWHZxS0I0UGZGNDMiLCJzdWIiOiJzNTRUcWhGZEFEUDVrOGJDZ1h2cUtCNFBmRjQzIiwiaWF0IjoxNzAzMDM4MzM5LCJleHAiOjE3MDMwNDE5MzksImVtYWlsIjoiYXJpcUB1bnR1a211LmFpIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMDIwMDIyMjUxNTg4NDMyMDIyODciXSwiZW1haWwiOlsiYXJpcUB1bnR1a211LmFpIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.R6kSuOFOxnOdV10B0JQ0EeGdhgzIIC_s3s_HCQtG4U67ODkBz5C4jypr_T-ddZlin9Zez5ifIYsxakt4bwenRlHScpdZ51tUhkwX0wdENMyVmxYBfgMO3gWdvVpRgKZBzETv7aWQXA-dMhL3v88KWFhZmGgvVF0LK6y8WcGCHEA6A73c4FeVAJ3wM1RcbjkkRjHbd4neukvwSqVYCuqAleCQWHbz4JEzoMXmxb01SMDqGSxCPaQznHIWDLE4CzcIn3J0NPFWjVC-AxttFemT9k2OVKSwnDFSdxzSXuCipwwV0w-DGi836AgFw0QlGTPjlEJDKHUDOX8w0qbMPqZObg"
  const urlLocal = "http://localhost:3000/v1";
  const urlDemo = "https://api.untukmu.co/v1";


  payload.append('heroes_nicknames', 'superhero')
  payload.append('heroes_nicknames', 'superhero')
  payload.append('heroes_nicknames', 'superhero')

  payload.append('heroes_relations', 'enemy')
  payload.append('heroes_relations', 'enemy')
  payload.append('heroes_relations', 'enemy')

  payloadReflection.append('heroes_images', http.file(imgFile, 'profile.jpeg', 'image/jpeg'));
  payloadReflection.append('heroes_images', http.file(imgFile, 'profile.jpeg', 'image/jpeg'));
  payloadReflection.append('heroes_images', http.file(imgFile, 'profile.jpeg', 'image/jpeg'));

  payload.append('highlight_titles', 'Test')
  payload.append('highlight_titles', 'Test')

  payloadReflection.append('highlight_images', http.file(imgFile, 'profile.jpeg', 'image/jpeg'));
  payloadReflection.append('highlight_images', http.file(imgFile, 'profile.jpeg', 'image/jpeg'));

  payload.append('best_gift_title', 'best')
  payloadReflection.append('best_gift_image', http.file(imgFile, 'profile.jpeg', 'image/jpeg'));

  payload.append('worst_gift_title', 'worst')
  payloadReflection.append('worst_gift_image', http.file(imgFile, 'profile.jpeg', 'image/jpeg'));

  payload.append('wish', 'test1')
  payload.append('wish', 'test2')
  payload.append('wish', 'test3')


  const personality = http.post(urlLocal, '/quiz-reflection', payloadReflection.body(), {
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${payload.boundary}`
    }
  })

    check(personality, {
    'is status 201': (r) => {
      console.log({status: r.status, body: r.body});
      return r.status === 201
    }
  })

  // payload.append('user_photo', http.file(imgFile, 'profile.jpeg', 'image/jpeg'))
  // payload.append('template', 'superhero')
  // payload.append('gender', 'female')

  // const res = http.post(urlDemo + '/ai-face-swap', payload.body(), { headers: { 
  //   Authorization: `Bearer ${token}`,
  //   "Content-Type": `multipart/form-data; boundary=${payload.boundary}`
  // }});

  // check(res, {
  //   'is status 201': (r) => {
  //     // console.log({status: r.status, body: r.body});
  //     return r.status === 201
  //   }
  // })

  sleep(0.2);
}
