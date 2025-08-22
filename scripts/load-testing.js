/**
 * Load Testing Script for Basketball Management System
 * 
 * This script tests the application under expected user volumes:
 * - 100 concurrent users (typical team size)
 * - 500 peak concurrent users (tournament scenario)
 * - Database read/write operations
 * - Authentication flows
 * - Real-time features
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export let options = {
  stages: [
    // Ramp-up to normal load
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    
    // Peak load testing
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 500 }, // Peak load - tournament scenario
    { duration: '2m', target: 200 }, // Ramp down
    
    // Cool down
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'], // Error rate under 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'https://oxwbeahwldxtwfezubdm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94d2JlYWh3bGR4dHdmZXp1YmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTM1OTIsImV4cCI6MjA2OTI2OTU5Mn0.n1vwlnzdFnyV_kEqmqYAYEqUf1C4YuqTAGnL4YQ1oV4';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

// Test scenarios
export default function () {
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - Read-heavy operations (viewing schedules, player stats)
    testReadOperations();
  } else if (scenario < 0.6) {
    // 30% - Authentication flows
    testAuthentication();
  } else if (scenario < 0.8) {
    // 20% - Write operations (updating performance data)
    testWriteOperations();
  } else {
    // 20% - Real-time features (chat, live updates)
    testRealtimeFeatures();
  }
  
  sleep(1);
}

function testReadOperations() {
  const responses = http.batch([
    ['GET', `${BASE_URL}/rest/v1/schedules`, null, { headers }],
    ['GET', `${BASE_URL}/rest/v1/players`, null, { headers }],
    ['GET', `${BASE_URL}/rest/v1/teams`, null, { headers }],
    ['GET', `${BASE_URL}/rest/v1/player_performance`, null, { headers }],
  ]);
  
  responses.forEach((response, index) => {
    const success = check(response, {
      [`Read operation ${index + 1} status 200`]: (r) => r.status === 200,
      [`Read operation ${index + 1} response time < 1s`]: (r) => r.timings.duration < 1000,
    });
    
    if (!success) {
      errorRate.add(1);
    }
  });
}

function testAuthentication() {
  const loginData = {
    email: `testuser${Math.floor(Math.random() * 1000)}@example.com`,
    password: 'TestPassword123!',
  };
  
  const response = http.post(
    `${BASE_URL}/auth/v1/signup`,
    JSON.stringify(loginData),
    { headers }
  );
  
  const success = check(response, {
    'Auth request status': (r) => r.status === 200 || r.status === 422, // 422 for existing users
    'Auth response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testWriteOperations() {
  const performanceData = {
    player_id: `player_${Math.floor(Math.random() * 100)}`,
    session_date: new Date().toISOString(),
    shots_made: Math.floor(Math.random() * 20),
    shots_attempted: Math.floor(Math.random() * 30) + 20,
    free_throws_made: Math.floor(Math.random() * 10),
    free_throws_attempted: Math.floor(Math.random() * 15) + 5,
  };
  
  const response = http.post(
    `${BASE_URL}/rest/v1/player_performance`,
    JSON.stringify(performanceData),
    { headers }
  );
  
  const success = check(response, {
    'Write operation status 201': (r) => r.status === 201 || r.status === 409, // 409 for conflicts
    'Write response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testRealtimeFeatures() {
  const wsUrl = `wss://oxwbeahwldxtwfezubdm.supabase.co/realtime/v1/websocket`;
  
  const response = ws.connect(wsUrl, {
    headers: {
      'Sec-WebSocket-Protocol': 'phoenix',
    },
  }, function (socket) {
    socket.on('open', () => {
      // Join realtime channel
      const joinMessage = {
        topic: 'realtime:public:chat_messages',
        event: 'phx_join',
        payload: {},
        ref: '1',
      };
      socket.send(JSON.stringify(joinMessage));
    });
    
    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });
  
  check(response, {
    'WebSocket connection established': (r) => r && r.status === 101,
  });
}

// Smoke test for critical endpoints
export function smokeTest() {
  const criticalEndpoints = [
    `${BASE_URL}/rest/v1/`,
    `${BASE_URL}/auth/v1/settings`,
    `${BASE_URL}/storage/v1/`,
  ];
  
  criticalEndpoints.forEach((endpoint) => {
    const response = http.get(endpoint, { headers });
    check(response, {
      [`${endpoint} is accessible`]: (r) => r.status < 500,
    });
  });
}

/**
 * Usage Instructions:
 * 
 * 1. Install k6: https://k6.io/docs/getting-started/installation/
 * 2. Run basic load test: k6 run load-testing.js
 * 3. Run with custom options: k6 run --duration 10m --vus 100 load-testing.js
 * 4. Run smoke test: k6 run --scenarios smoke=smoke load-testing.js
 * 
 * Expected Results:
 * - 95% of requests should complete under 2 seconds
 * - Error rate should be below 10%
 * - System should handle 500 concurrent users during peak load
 * - WebSocket connections should establish successfully
 * 
 * Monitoring During Test:
 * - Monitor Supabase dashboard for database performance
 * - Check CPU and memory usage
 * - Monitor real-time connection limits
 * - Watch for rate limiting or throttling
 */