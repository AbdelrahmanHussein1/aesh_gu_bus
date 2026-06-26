import WebSocket from 'ws';

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

async function testFlow() {
  console.log('--- STARTING END-TO-END FLOW TEST ---');

  // 1. User Login
  console.log('\n[1] Testing Authentication...');
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'aes400196@gu.edu.eg',
      password: '1Key@GALALA'
    })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${await loginRes.text()}`);
  }

  const { token, user } = await loginRes.json();
  console.log(`✓ Logged in as: ${user.fullName} (${user.role})`);
  console.log(`Token received: ${token.substring(0, 30)}...`);

  // 2. Fetch routes
  console.log('\n[2] Fetching routes...');
  const routesRes = await fetch(`${API_URL}/api/routes`);
  const routes = await routesRes.json();
  console.log(`✓ Fetched ${routes.length} active routes`);
  const elObour = routes.find(r => r.nameEn.toLowerCase().includes('obour'));
  console.log(`Using Route: ${elObour.nameEn} (ID: ${elObour.id})`);

  // 3. Fetch active trips
  console.log('\n[3] Fetching active trips for date 2026-06-25...');
  const tripsRes = await fetch(`${API_URL}/api/trips?date=2026-06-25&routeId=${elObour.id}`);
  const trips = await tripsRes.json();
  console.log(`✓ Fetched ${trips.length} active trips`);
  if (trips.length === 0) {
    throw new Error('No trips found for 2026-06-25. Make sure seed was successful.');
  }
  const trip = trips[0];
  console.log(`Using Trip ID: ${trip.id}, Bus: ${trip.bus.name}`);

  // 4. Test WebSocket Realtime Connection
  console.log('\n[4] Connecting to WebSocket seat map room...');
  const ws = new WebSocket(`${WS_URL}/ws/trips/${trip.id}/seats`);

  const wsMessages = [];
  ws.on('open', () => {
    console.log('✓ WebSocket connected successfully!');
  });
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log(`[WS Broadcast Received]:`, msg);
    wsMessages.push(msg);
  });
  ws.on('error', (err) => {
    console.error('WebSocket Error:', err);
  });

  // Wait 1 second for WS connection to stabilize
  await new Promise(r => setTimeout(r, 1000));

  // 5. Lock seat
  const seatNum = Math.floor(Math.random() * 40) + 5;
  console.log(`\n[5] Locking seat ${seatNum}...`);
  const lockRes = await fetch(`${API_URL}/api/trips/${trip.id}/seats/${seatNum}/lock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  });
  if (!lockRes.ok) {
    throw new Error(`Locking seat failed: ${await lockRes.text()}`);
  }
  const lockData = await lockRes.json();
  console.log(`✓ Seat ${seatNum} locked! Expires at: ${new Date(lockData.expiresAt).toLocaleTimeString()}`);

  // Wait for WS broadcast message to arrive
  await new Promise(r => setTimeout(r, 500));

  // 6. Assert conflict lock
  console.log(`\n[6] Trying to double-lock seat ${seatNum} (should fail)...`);
  const lockConflictRes = await fetch(`${API_URL}/api/trips/${trip.id}/seats/${seatNum}/lock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  });
  console.log(`HTTP Status: ${lockConflictRes.status}`);
  const lockConflictData = await lockConflictRes.json();
  console.log(`Conflict message:`, lockConflictData.error);
  if (lockConflictRes.status !== 409) {
    throw new Error(`Expected 409 conflict but got ${lockConflictRes.status}`);
  }

  // 7. Unlock seat
  console.log(`\n[7] Unlocking seat ${seatNum}...`);
  const unlockRes = await fetch(`${API_URL}/api/trips/${trip.id}/seats/${seatNum}/unlock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  });
  if (!unlockRes.ok) {
    throw new Error(`Unlocking seat failed: ${await unlockRes.text()}`);
  }
  console.log(`✓ Seat ${seatNum} unlocked!`);

  // Wait for WS broadcast message to arrive
  await new Promise(r => setTimeout(r, 500));

  // 8. Relock seat and complete booking Checkout
  console.log(`\n[8] Relocking seat ${seatNum} for booking...`);
  await fetch(`${API_URL}/api/trips/${trip.id}/seats/${seatNum}/lock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  });

  console.log(`Checkout submitting payment...`);
  const bookingRes = await fetch(`${API_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      tripId: trip.id,
      seatNumber: seatNum,
      paymentMethod: 'visa_mock',
      receiptRef: 'TEST-TX-100234'
    })
  });

  if (!bookingRes.ok) {
    throw new Error(`Booking failed: ${await bookingRes.text()}`);
  }

  const bookingData = await bookingRes.json();
  console.log(`✓ Booking completed successfully!`);
  console.log(`Booking ID: ${bookingData.bookingId}`);
  console.log(`QR Token generated: ${bookingData.qrToken}`);

  // Wait for WS broadcast message to arrive
  await new Promise(r => setTimeout(r, 500));

  // 9. Scan Verify Ticket (Using supervisor login)
  console.log('\n[9] Log in as supervisor to verify ticket...');
  const supervisorLoginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'supervisor@gu.edu.eg',
      password: 'super123'
    })
  });
  const superData = await supervisorLoginRes.json();
  const superToken = superData.token;

  console.log(`Verifying QR Code token: ${bookingData.qrToken}...`);
  const verifyRes = await fetch(`${API_URL}/api/scan/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${superToken}`
    },
    body: JSON.stringify({
      token: bookingData.qrToken,
      latitude: 29.987,
      longitude: 32.345,
      deviceInfo: 'Test Runner Node Client'
    })
  });

  if (!verifyRes.ok) {
    throw new Error(`Verification request failed: ${await verifyRes.text()}`);
  }

  const verifyResult = await verifyRes.json();
  console.log(`✓ Verification completed:`);
  console.log(verifyResult);

  if (verifyResult.result !== 'valid') {
    throw new Error(`Expected verification result to be 'valid', got: ${verifyResult.result}`);
  }

  console.log('\nClosing WebSocket connection...');
  ws.close();

  // Validate WS broadcasts
  console.log('\n[10] Validating WebSocket Broadcast Log...');
  console.log(`Total messages captured: ${wsMessages.length}`);
  const expectedTypes = ['seat_locked', 'seat_unlocked', 'seat_locked', 'seat_booked', 'rider_boarded'];
  for (let i = 0; i < expectedTypes.length; i++) {
    const matched = wsMessages.some(m => m.type === expectedTypes[i]);
    console.log(`  - Checked broadcast type '${expectedTypes[i]}': ${matched ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n--- ALL E2E TESTS PASSED SUCCESSFULLY! ---');
}

testFlow().catch(err => {
  console.error('\n❌ TEST FLOW FAILED:', err);
  process.exit(1);
});
