import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudBackend, createRequestBudget } from './cloud-core.mjs';
function storage() {
  const map = new Map();
  return { async get(key) { return structuredClone(map.get(key)); }, async put(key, value) { map.set(key, structuredClone(value)); } };
}
test('rolling request budget is concurrent-safe and survives a restarted backend', async () => {
  const store = storage(); let now = 1000;
  const reserve = createRequestBudget(store, 2, () => now);
  const results = await Promise.allSettled([reserve(), reserve(), reserve()]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 2);
  await assert.rejects(createRequestBudget(store, 2, () => now)(), { code: 'request-budget-exhausted' });
  now += 24 * 60 * 60 * 1000 + 60000;
  await createRequestBudget(store, 2, () => now)();
});
test('persistent provider cache retains observation age across object restarts without storing keys', async () => {
  const store = storage(); let calls = 0; let clock = 1000;
  const fake = async url => {
    calls++;
    const lines = { LINE_ID: 1, LINE_NAME: '순환', DIR_UP_NAME: 'A', DIR_DOWN_NAME: 'A' };
    const vehicle = { LINE_ID: 1, BUS_ID: 'bus', SEQ: 1, CURR_STOP_ID: 1, CARNO: '광주77' };
    const isLines = url.pathname.endsWith('lineInfo');
    return { ok: true, json: async () => ({ RESPONSE: { RESULT: { RESULT_CODE: 'SUCCESS' }, [isLines ? 'LINE_LIST' : 'BUSLOCATION_LIST']: { ITEM: [isLines ? lines : vehicle] }, ROW_COUNT: 1 } }) };
  };
  const env = { GWANGJU_BUS_SERVICE_KEY: 'private-secret', GWANGJU_BUS_DAILY_LIMIT: 2 };
  const first = createCloudBackend(store, env, fake, () => clock);
  const request = new Request('https://example.test/routes/1/vehicles');
  assert.equal((await first(request)).status, 200); assert.equal(calls, 2);
  clock = 2000;
  const second = createCloudBackend(store, env, fake, () => clock);
  const response = await second(request); const data = await response.json();
  assert.equal(data[0].ageMs, 1000); assert.equal(calls, 2);
  assert.equal(JSON.stringify(await store.get('cache:lineInfo:{}')).includes('private-secret'), false);
  clock=20000; assert.equal((await second(request)).status,429); assert.equal(calls,2);
});
test('invalid methods and paths consume no official API calls', async () => {
  let calls=0;
  const backend=createCloudBackend(storage(),{ GWANGJU_BUS_SERVICE_KEY:'private-secret' },async()=>{ calls++; throw new Error(); });
  assert.equal((await backend(new Request('https://example.test/routes',{method:'POST'}))).status,405);
  assert.equal((await backend(new Request('https://example.test/unknown'))).status,404);
  assert.equal((await backend(new Request('https://example.test/routes?serviceKey=accidental'))).status,400);
  assert.equal((await backend(new Request('https://example.test/health'))).status,200);
  assert.equal(calls,0);
});
