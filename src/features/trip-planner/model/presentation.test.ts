import { expect, it } from '@jest/globals';
import { calculateTripProgress } from '@/entities/trip';
import { demoRoute } from './demo-route';
import { presentTrip } from './presentation';
const selection = { route: demoRoute, boardingSequence: 10, destinationSequence: 50 };
it('shows destination and approaching warning in both notification and chip', () => {
  const progress = calculateTripProgress(selection, { vehicleId: 'demo', routeId: demoRoute.id, reachedSequence: 40, observedAt: 1000 }, 1000);
  expect(presentTrip('trip', demoRoute, progress, true)).toMatchObject({ phase: 'approaching', chipText: '하차 준비', alert: true, completedStops: 3, totalStops: 4 });
});
it('suppresses warning and ETA when a cached observation is stale', () => {
  const progress = calculateTripProgress(selection, { vehicleId: 'demo', routeId: demoRoute.id, reachedSequence: 40, observedAt: 1000, etaEpochMillis: 100000 }, 62000);
  expect(presentTrip('trip', demoRoute, progress, true)).toMatchObject({ alert: false, etaEpochMillis: undefined, body: '위치 정보를 다시 확인하고 있어요.' });
});
