import assert from 'node:assert/strict';

// Force the deterministic in-memory backend before importing the API modules.
process.env.REDIS_URL = '';
const { CacheService } = await import('../apps/api/dist/services/cache.service.js');

async function runTests() {
  console.log('--- Testing Redis Cache-Aside Layer & Pattern Invalidation ---');

  // 1. Basic Set & Get
  await CacheService.setCache('cache:test:1', { message: 'hello world', num: 42 }, 10);
  const val = await CacheService.getCache('cache:test:1');
  assert.equal(val?.num, 42, 'setCache / getCache mismatch');
  console.log('✓ setCache and getCache working');

  // 2. Schedule cache pattern
  await CacheService.setCache('cache:schedules:2026-09-08:all', [{ id: 101, name: 'Trip 1' }], 60);
  await CacheService.setCache('cache:schedules:2026-09-08:29', [{ id: 102, name: 'Trip 2' }], 60);
  await CacheService.setCache('cache:fleet:2026-09-08:all:all:all:all:none', [{ tripId: 101, status: 'scheduled' }], 30);

  const sched1 = await CacheService.getCache('cache:schedules:2026-09-08:all');
  assert.equal(sched1?.length, 1, 'schedule cache missing');
  console.log('✓ Schedule and fleet caches set successfully');

  // 3. Invalidate schedules and fleet
  await CacheService.invalidateTripsAndFleetCache(101);

  const schedAfter = await CacheService.getCache('cache:schedules:2026-09-08:all');
  const fleetAfter = await CacheService.getCache('cache:fleet:2026-09-08:all:all:all:all:none');
  assert.equal(schedAfter, null, 'schedule cache not invalidated');
  assert.equal(fleetAfter, null, 'fleet cache not invalidated');
  console.log('✓ invalidateTripsAndFleetCache successfully purged all schedule and fleet caches');

  // 4. Seat cache
  await CacheService.setCache('cache:trip_seats:101', [{ seatNumber: 1, status: 'booked' }], 5);
  await CacheService.setCache('cache:seat_details:101', { trip: { id: 101 }, seats: [] }, 5);

  let seats = await CacheService.getCache('cache:trip_seats:101');
  assert.equal(seats?.[0]?.status, 'booked', 'seat cache missing');

  await CacheService.invalidateSeatCache(101);
  const seatsAfter = await CacheService.getCache('cache:trip_seats:101');
  const detailsAfter = await CacheService.getCache('cache:seat_details:101');
  assert.equal(seatsAfter, null, 'seat cache not invalidated');
  assert.equal(detailsAfter, null, 'seat details cache not invalidated');
  console.log('✓ invalidateSeatCache successfully purged trip seat maps');

  console.log('--- ALL CACHE TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
