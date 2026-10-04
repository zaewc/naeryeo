import { expect, it, jest } from '@jest/globals';
import { createTripTrackingAdapter, parseTrackingSnapshot } from './index';
jest.mock('@modules/live-update', () => ({ NaeryeoLiveUpdate: null }));
const snapshot = { config: { id: 'trip-1', routeId: '1', routeName: '순환01A', vehicleId: 'bus', registration: '광주77',
  boardingSequence: 1, destinationSequence: 3, stops: [{ id: 'a', name: '탑승', sequence: 1 }, { id: 'a', name: '재방문', sequence: 3 }],
  endpoint: 'https://example.test/routes/1/vehicles', initialSequence: 1, initialObservedAt: 1000, startedAt: 1000 },
  reachedSequence: 1, observedAt: 1000, phase: 'tracking', error: null, running: true };
it('restores native-owned trip with its original vehicle and stop sequence', () => {
  expect(parseTrackingSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
});
it('rejects corrupt persisted state instead of silently restarting a trip', () => {
  expect(() => parseTrackingSnapshot(JSON.stringify({ ...snapshot, reachedSequence: 1.5 }))).toThrow();
  expect(() => parseTrackingSnapshot(JSON.stringify({ ...snapshot, phase: 'unknown' }))).toThrow();
});
it('is unavailable gracefully on platforms without the Android service', async () => {
  expect(await createTripTrackingAdapter().snapshot()).toBeNull();
  await expect(createTripTrackingAdapter().start(snapshot.config)).rejects.toMatchObject({ code: 'unavailable' });
});
