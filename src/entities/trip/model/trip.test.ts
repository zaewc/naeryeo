import { it, expect } from '@jest/globals';
import { calculateTripProgress, InvalidTripError, type TripSelection } from './trip';
const selection: TripSelection = {
  route: { id: 'route-1', name: '테스트', direction: '광주', stops: [
    { id: 'a', name: '탑승', sequence: 10 }, { id: 'b', name: '중간', sequence: 20 },
    { id: 'a', name: '순환 재방문', sequence: 30 }, { id: 'd', name: '목적지', sequence: 40 },
  ] }, boardingSequence: 10, destinationSequence: 40,
};
const observation = { vehicleId: 'bus-1', routeId: 'route-1', reachedSequence: 10, observedAt: 1000 };
it('counts actual stops, including a repeated station, rather than sequence differences', () => {
  expect(calculateTripProgress(selection, observation, 1000)).toMatchObject({ totalStops: 3, remainingStops: 3, nextStop: { sequence: 20 } });
});
it('detects approaching and arrival using the selected direction', () => {
  expect(calculateTripProgress(selection, { ...observation, reachedSequence: 30 }, 1000).phase).toBe('approaching');
  expect(calculateTripProgress(selection, { ...observation, reachedSequence: 40 }, 1000)).toMatchObject({ phase: 'arrived', nextStop: null, remainingStops: 0 });
});
it('does not expose stale ETA as live arrival information', () => {
  expect(calculateTripProgress(selection, { ...observation, etaEpochMillis: 100000 }, 62000)).toMatchObject({ freshness: 'stale', etaEpochMillis: undefined });
});
it('rejects wrong-route vehicles and unknown stop sequences', () => {
  expect(() => calculateTripProgress(selection, { ...observation, routeId: 'other' }, 1000)).toThrow(InvalidTripError);
  expect(() => calculateTripProgress(selection, { ...observation, reachedSequence: 25 }, 1000)).toThrow(InvalidTripError);
});
it('rejects reverse destinations and future observations', () => {
  expect(() => calculateTripProgress({ ...selection, boardingSequence: 40 }, observation, 1000)).toThrow(InvalidTripError);
  expect(() => calculateTripProgress(selection, observation, 999)).toThrow(InvalidTripError);
});
