import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errors = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 500 }, // Stay at 500 users for 5 minutes
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '3m', target: 1000 }, // Stay at 1000 users for 3 minutes
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<3500'], // 95% of requests must complete below 3.5s
    http_req_failed: ['rate<0.005'], // Error rate must be below 0.5%
    errors: ['rate<0.005'],
  },
};

const BASE_URL = 'https://id-preview--9a7df55c-cf11-4367-ab0d-5ed7f247add9.lovable.app';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94d2JlYWh3bGR4dHdmZXp1YmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTM1OTIsImV4cCI6MjA2OTI2OTU5Mn0.n1vwlnzdFnyV_kEqmqYAYEqUf1C4YuqTAGnL4YQ1oV4';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'User-Agent': 'k6-load-test'
};

export default function () {
  // Randomly select test scenario
  const scenarios = [testReadOperations, testAuthentication, testWriteOperations, testRealtimeFeatures];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
  sleep(1);
}

function testReadOperations() {
  const batch = [
    ['GET', `https://oxwbeahwldxtwfezubdm.supabase.co/rest/v1/schedules?select=*&limit=10`, null, { headers }],
    ['GET', `https://oxwbeahwldxtwfezubdm.supabase.co/rest/v1/players?select=*&limit=10`, null, { headers }],
    ['GET', `https://oxwbeahwldxtwfezubdm.supabase.co/rest/v1/teams?select=*&limit=5`, null, { headers }],
    ['GET', `https://oxwbeahwldxtwfezubdm.supabase.co/rest/v1/player_performance?select=*&limit=10`, null, { headers }],
  ];

  const responses = http.batch(batch);
  
  responses.forEach((response, i) => {
    const success = check(response, {
      [`Request ${i} is status 200`]: (r) => r.status === 200,
      [`Request ${i} response time < 300ms`]: (r) => r.timings.duration < 300,
    });
    
    if (!success) {
      errors.add(1);
    }
  });
}

function testAuthentication() {
  const signupData = {
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    password: 'TestPass123!',
    data: {
      full_name: 'Test User',
      preferred_role: 'player'
    }
  };

  const response = http.post(
    'https://oxwbeahwldxtwfezubdm.supabase.co/auth/v1/signup',
    JSON.stringify(signupData),
    { headers }
  );

  const success = check(response, {
    'signup status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!success) {
    errors.add(1);
  }
}

function testWriteOperations() {
  const performanceData = {
    player_id: '12345678-1234-1234-1234-123456789012', // Mock UUID
    game_date: new Date().toISOString().split('T')[0],
    points: Math.floor(Math.random() * 30),
    rebounds: Math.floor(Math.random() * 15),
    assists: Math.floor(Math.random() * 10)
  };

  const response = http.post(
    'https://oxwbeahwldxtwfezubdm.supabase.co/rest/v1/player_performance',
    JSON.stringify(performanceData),
    { headers }
  );

  const success = check(response, {
    'write status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    'write response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!success) {
    errors.add(1);
  }
}

function testRealtimeFeatures() {
  const url = 'wss://oxwbeahwldxtwfezubdm.supabase.co/realtime/v1/websocket?apikey=' + ANON_KEY;
  
  const response = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({
        topic: 'realtime:public:schedules',
        event: 'phx_join',
        payload: {},
        ref: '1'
      }));
    });

    socket.on('message', (message) => {
      const data = JSON.parse(message);
      check(data, {
        'websocket message received': (data) => data !== null,
      });
    });

    socket.setTimeout(() => {
      socket.close();
    }, 2000);
  });

  check(response, {
    'websocket connected': (r) => r && r.status === 101,
  });
}

// Smoke test for critical endpoints
export function smokeTest() {
  const endpoints = [
    'https://oxwbeahwldxtwfezubdm.supabase.co/rest/v1/',
    'https://oxwbeahwldxtwfezubdm.supabase.co/auth/v1/settings',
    'https://oxwbeahwldxtwfezubdm.supabase.co/storage/v1/'
  ];

  endpoints.forEach(endpoint => {
    const response = http.get(endpoint, { headers });
    check(response, {
      [`${endpoint} is accessible`]: (r) => r.status === 200 || r.status === 404,
    });
  });
}