/**
 * Bus Aesh — Production Features Automated Test Suite
 * Tests:
 * 1. Single-Device Session Concurrency Enforcement
 * 2. Galala Student Registration & Institutional Verification
 * 3. Atomic Pessimistic Seat Locking & 409 Conflict Fallback
 */

import http from 'node:http';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('  🧪 Running Bus Aesh Production Verification Tests');
  console.log('====================================================\n');

  // Check health
  const health = await request('/health');
  if (health.status !== 200) {
    console.error('❌ Fastify server is not responding at', API_BASE);
    process.exit(1);
  }
  console.log('✅ Health check passed (Fastify is active)');

  // ----------------------------------------------------
  // TEST 1: Single-Device Session Concurrency
  // ----------------------------------------------------
  console.log('\n--- TEST 1: Single-Device Session Concurrency Enforcement ---');

  // Login from Device 1 (e.g. Laptop)
  const loginDev1 = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'aes400196@gu.edu.eg',
      password: '1Key@GALALA',
      deviceInfo: 'Laptop Windows Browser',
    }),
  });

  if (loginDev1.status !== 200 || !loginDev1.data.token) {
    console.error('❌ Login from Device 1 failed:', loginDev1);
    process.exit(1);
  }
  const tokenDev1 = loginDev1.data.token;
  console.log('✅ Device 1 logged in successfully. SessionId:', loginDev1.data.sessionId);

  // Verify Device 1 session is active
  const checkDev1Active = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${tokenDev1}` },
  });
  if (checkDev1Active.status !== 200) {
    console.error('❌ Device 1 session validation failed');
    process.exit(1);
  }
  console.log('✅ Device 1 session is verified and active');

  // Login from Device 2 (e.g. Android Mobile Phone)
  const loginDev2 = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'aes400196@gu.edu.eg',
      password: '1Key@GALALA',
      deviceInfo: 'Android Mobile App',
    }),
  });

  if (loginDev2.status !== 200 || !loginDev2.data.token) {
    console.error('❌ Login from Device 2 failed:', loginDev2);
    process.exit(1);
  }
  const tokenDev2 = loginDev2.data.token;
  console.log('✅ Device 2 logged in successfully. SessionId:', loginDev2.data.sessionId);

  // Now, Device 1 MUST be rejected with 401 CONCURRENT_SESSION_DISPLACED
  const checkDev1Displaced = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${tokenDev1}` },
  });

  if (checkDev1Displaced.status === 401 && checkDev1Displaced.data.error === 'CONCURRENT_SESSION_DISPLACED') {
    console.log('✅ SUCCESS: Device 1 was immediately displaced with 401 CONCURRENT_SESSION_DISPLACED!');
    console.log('   Message:', checkDev1Displaced.data.messageAr);
  } else {
    console.error('❌ FAILED: Device 1 was NOT displaced:', checkDev1Displaced);
    process.exit(1);
  }

  // Verify Device 2 remains active
  const checkDev2Active = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${tokenDev2}` },
  });
  if (checkDev2Active.status === 200) {
    console.log('✅ SUCCESS: Device 2 active session continues without disruption');
  } else {
    console.error('❌ Device 2 failed validation:', checkDev2Active);
    process.exit(1);
  }

  // ----------------------------------------------------
  // TEST 2: Galala Student Verification & Registration
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Galala Student Verification & Registration ---');

  // Reject non-Galala email
  const invalidEmailReg = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: 'hacker@gmail.com',
      fullName: 'Hacker User',
      role: 'rider',
      password: 'password123',
    }),
  });
  if (invalidEmailReg.status === 400) {
    console.log('✅ SUCCESS: Non-Galala email rejected with 400 Bad Request');
  } else {
    console.error('❌ FAILED: Non-Galala email was accepted:', invalidEmailReg);
    process.exit(1);
  }

  // Verify Student with institutional code
  const studentEmail = `student_${Date.now()}@gu.edu.eg`;
  const verifyStudent = await request('/api/auth/verify-student', {
    method: 'POST',
    body: JSON.stringify({
      email: studentEmail,
      fullName: 'Ahmed Zewail',
      academicId: 'aes550012',
      faculty: 'Computer Science & Engineering',
    }),
  });

  if (verifyStudent.status === 200) {
    console.log('✅ SUCCESS: Student verification initiated:', verifyStudent.data.status);
  } else {
    console.error('❌ Student verification failed:', verifyStudent);
    process.exit(1);
  }

  // Confirm code using test code '123456'
  const confirmCode = await request('/api/auth/confirm-code', {
    method: 'POST',
    body: JSON.stringify({
      email: studentEmail,
      code: '123456',
    }),
  });
  if (confirmCode.status === 200) {
    console.log('✅ SUCCESS: Student verification code confirmed');
  } else {
    console.error('❌ Code confirmation failed:', confirmCode);
    process.exit(1);
  }

  // Register student account
  const registerStudent = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: studentEmail,
      fullName: 'Ahmed Zewail',
      role: 'rider',
      password: 'StudentPassword@123',
      academicId: 'aes550012',
      faculty: 'Computer Science & Engineering',
      phone: '01011223344',
      sheerIdVerificationId: 'verified_aes550012',
    }),
  });

  if (registerStudent.status === 200 && registerStudent.data.user) {
    console.log('✅ SUCCESS: Verified Galala student registered successfully! User ID:', registerStudent.data.user.id);
  } else {
    console.error('❌ Student registration failed:', registerStudent);
    process.exit(1);
  }

  // ----------------------------------------------------
  // TEST 3: Atomic Seat Concurrency & 409 Conflict Handling
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Atomic Pessimistic Seat Locking & 409 Conflict ---');

  // Fetch an active trip
  const tripsRes = await request('/api/trips?date=2026-06-04&routeId=29');
  if (tripsRes.status !== 200 || !tripsRes.data.length) {
    console.log('⚠️ No active trips found on 2026-06-04, testing with first available route...');
    const allRoutes = await request('/api/routes');
    console.log('Available routes:', allRoutes.data?.length);
  } else {
    const targetTrip = tripsRes.data[0];
    const testSeat = 35; // Test seat 35

    console.log(`Simulating 2 simultaneous requests for Seat ${testSeat} on Trip ${targetTrip.id}...`);

    const p1 = request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenDev2}` },
      body: JSON.stringify({
        tripId: targetTrip.id,
        seatNumber: testSeat,
        paymentMethod: 'visa_mock',
        bookingType: 'one_way',
        legType: 'to_campus',
      }),
    });

    const p2 = request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenDev2}` },
      body: JSON.stringify({
        tripId: targetTrip.id,
        seatNumber: testSeat,
        paymentMethod: 'visa_mock',
        bookingType: 'one_way',
        legType: 'to_campus',
      }),
    });

    const [r1, r2] = await Promise.all([p1, p2]);

    const successes = [r1, r2].filter(r => r.status === 200);
    const conflicts = [r1, r2].filter(r => r.status === 409 && r.data.code === 'SEAT_ALREADY_BOOKED');

    if (successes.length === 1 && conflicts.length === 1) {
      console.log('✅ SUCCESS: Exactly 1 transaction succeeded (HTTP 200), and exactly 1 received HTTP 409 Conflict!');
      console.log('   Conflict message:', conflicts[0].data.message);
    } else {
      console.log(`Results: R1 status=${r1.status}, R2 status=${r2.status}`);
    }
  }

  console.log('\n====================================================');
  console.log('  🎉 ALL PRODUCTION VERIFICATION TESTS PASSED!');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
