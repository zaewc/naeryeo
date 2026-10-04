import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGwangjuProvider, mapRoute, mapVehicles } from './gwangju.mjs';
const payload = (list, items) => ({ RESPONSE: { RESULT: { RESULT_CODE: 'SUCCESS' }, [list]: { ITEM: items }, ROW_COUNT: items.length } });
test('maps actual provider sequence while retaining repeated stop identities', () => {
  const route = mapRoute(payload('BUSSTOP_LIST', [
    { LINE_ID: 1, BUSSTOP_ID: 9, BUSSTOP_NAME: '재방문', SEQ: 3 },
    { LINE_ID: 1, BUSSTOP_ID: 9, BUSSTOP_NAME: '기점', SEQ: 1 },
  ]), '1', { id: '1', name: '순환', direction: '순환' });
  assert.deepEqual(route.stops.map(s => [s.id,s.sequence]), [['9',1],['9',3]]);
  assert.throws(() => mapVehicles(payload('BUSLOCATION_LIST', [{ LINE_ID: 2 }]), '1', 100));
});
test('coalesces concurrent calls and preserves observation age in cache', async () => {
  let calls = 0; let clock = 100;
  const provider = createGwangjuProvider({ key: 'encoded%2Bkey', now: () => clock, fetcher: async url => {
    calls++; assert.equal(url.searchParams.get('serviceKey'), 'encoded+key');
    const data = url.pathname.endsWith('lineInfo') ? payload('LINE_LIST', [{ LINE_ID: 1, LINE_NAME: '순환', DIR_UP_NAME: 'A', DIR_DOWN_NAME: 'A' }]) :
      payload('BUSLOCATION_LIST', [{ LINE_ID: 1, BUS_ID: 'bus', SEQ: 3, CURR_STOP_ID: 9, CARNO: '광주77' }]);
    return { ok: true, json: async () => data };
  } });
  const results = await Promise.all([provider.vehicles('1'),provider.vehicles('1')]);
  assert.equal(calls,2); assert.equal(results[0][0].observedAt,100);
  clock=1000; assert.equal((await provider.vehicles('1'))[0].observedAt,100);
  clock=16000; await provider.vehicles('1'); assert.equal(calls,3);
});
test('redacts upstream exceptions and rejects API error envelopes', async () => {
  const provider = createGwangjuProvider({ key: 'secret', fetcher: async () => { throw new Error('secret-bearing URL'); } });
  await assert.rejects(provider.lines(), { message: 'upstream-unavailable' });
  const rejected = createGwangjuProvider({ key: 'secret', fetcher: async () => ({ ok: true, json: async () => ({ RESPONSE: { RESULT: { RESULT_CODE: 'ERROR' } } }) }) });
  await assert.rejects(rejected.lines(), { message: 'provider-rejected' });
});
