import { afterEach, expect, it, jest } from '@jest/globals';
import { createTransitApi } from './transit-api';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
it('rejects vehicles from another route before progress calculation', async () => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([{ routeId: '2' }]), { status: 200 }));
  await expect(createTransitApi('https://example.test').vehicles('1')).rejects.toThrow('차량이 일치하지');
});
it('preserves repeated stop identity and provider sequence in normalized route', async () => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: '1', name: '순환', direction: 'A → A', stops: [
    { id: 'a', name: '기점', sequence: 1 }, { id: 'a', name: '재방문', sequence: 20 },
  ] }), { status: 200 }));
  expect((await createTransitApi('https://example.test').route('1')).stops.map(s => s.sequence)).toEqual([1,20]);
});
it('does not expose backend error bodies or credentials to the user', async () => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(new Response('sensitive upstream detail', { status: 502 }));
  await expect(createTransitApi('https://example.test').routes()).rejects.toThrow('버스 정보 제공이 지연');
});
it('converts server cache age to local time even when server and device clocks differ', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(10000);
  try {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([
      { routeId: '1', vehicleId: 'bus', reachedSequence: 20, observedAt: 9999999, ageMs: 1500, registration: '광주77', currentStopId: 'a' },
    ]), { status: 200 }));
    expect((await createTransitApi('https://example.test').vehicles('1'))[0]?.observedAt).toBe(8500);
  } finally { clock.mockRestore(); }
});
