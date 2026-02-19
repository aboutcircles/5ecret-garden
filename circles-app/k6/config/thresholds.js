export function buildThresholds() {
  return {
    checks: ['rate>0.99'],

    'http_req_failed{component:pathfinder_send}': [
      { threshold: 'rate<0.01', abortOnFail: true },
    ],
    'http_req_duration{component:pathfinder_send}': [
      { threshold: 'p(95)<1200', abortOnFail: true },
    ],

    'http_req_failed{component:scroll}': [
      { threshold: 'rate<0.02', abortOnFail: true },
    ],
    'http_req_duration{component:scroll}': [
      { threshold: 'p(95)<1000', abortOnFail: true },
    ],

    'http_req_failed{component:profile_read}': [
      { threshold: 'rate<0.02', abortOnFail: true },
    ],
    'http_req_duration{component:profile_read}': [
      { threshold: 'p(95)<1000', abortOnFail: true },
    ],

    'http_req_failed{component:profile_write}': [
      { threshold: 'rate<0.01', abortOnFail: true },
    ],
    'http_req_duration{component:profile_write}': [
      { threshold: 'p(95)<1500', abortOnFail: true },
    ],

    'http_req_failed{component:market_bg}': [
      { threshold: 'rate<0.03', abortOnFail: false },
    ],
    'http_req_duration{component:market_bg}': [
      { threshold: 'p(95)<1800', abortOnFail: false },
    ],
  };
}
