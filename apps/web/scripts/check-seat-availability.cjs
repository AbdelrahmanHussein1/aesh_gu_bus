// Run from the repository root: node apps/web/scripts/check-seat-availability.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadTypeScript(relativePath) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const loaded = new Module(filename, module);
  loaded._compile(compiled, filename);
  return loaded.exports;
}
const { combineSeatMaps, fetchSeatMaps } = loadTypeScript('../hooks/seatAvailability.ts');
const { getRouteCategory, getCategoryRoutes, ROUTE_CATEGORIES } = loadTypeScript('../lib/routes-config.ts');
const seat = (seatNumber, status = 'free', userId = null) => ({ seatNumber, status, userId });

async function run() {
  const first = [seat(1), seat(2), seat(3), seat(4)];
  const second = [seat(1, 'booked'), seat(2, 'held', 'other'), seat(3, 'held', 'qa')];
  assert.deepEqual(combineSeatMaps([first, second], 'qa'), [seat(1, 'booked'), seat(2, 'held'), seat(3, 'held', 'qa')]);
  assert.deepEqual(combineSeatMaps([], 'qa'), []);
  assert.deepEqual(combineSeatMaps([first, []], 'qa'), []);
  assert.deepEqual(first, [seat(1), seat(2), seat(3), seat(4)], 'Combining must not mutate the first leg');

  const developmentRoute = { id: 375, nameAr: 'QA', nameEn: 'CODEX DEVELOPMENT TEST ROUTE - NO REAL SERVICE' };
  const liveRoutes = [{ id: 29, nameAr: 'Live Suez', nameEn: 'Live Suez' }, developmentRoute];
  assert.equal(getRouteCategory(375), 'other', 'Unknown server routes must remain selectable under Other');
  assert.deepEqual(getCategoryRoutes('other', liveRoutes), [developmentRoute]);
  assert.deepEqual(getCategoryRoutes('suez', liveRoutes), [liveRoutes[0]]);
  for (const category of ROUTE_CATEGORIES) {
    assert.deepEqual(getCategoryRoutes(category.key, []), [], 'An empty live list must not synthesize predefined services');
  }

  const originalFetch = global.fetch;
  try {
    const calls = [];
    global.fetch = async url => { calls.push(url); return { ok: true, json: async () => first }; };
    const result = await fetchSeatMaps([11, 12], 'https://qa.example', new AbortController().signal);
    assert.equal(result.length, 2);
    assert.deepEqual(calls, ['https://qa.example/api/trips/11/seats', 'https://qa.example/api/trips/12/seats']);
    global.fetch = async () => ({ ok: false, status: 500 });
    await assert.rejects(fetchSeatMaps([11], 'https://qa.example', new AbortController().signal), /could not be loaded/);
    global.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(fetchSeatMaps([11], 'https://qa.example', new AbortController().signal), /Failed to fetch/);
    global.fetch = async () => ({ ok: true, json: async () => [seat(0)] });
    await assert.rejects(fetchSeatMaps([11], 'https://qa.example', new AbortController().signal), /invalid seat map/);
  } finally {
    global.fetch = originalFetch;
  }
  console.log('Booking checks passed: both seat legs, ownership, empty maps, HTTP/network failures, invalid responses, unknown server routes and empty live categories.');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
