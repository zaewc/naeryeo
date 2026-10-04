import { expect, it } from '@jest/globals';
import { transitionTrip } from './state';
import { InvalidTripError } from './trip';
it('supports the trip lifecycle including cancellation and restarting', () => {
  expect(transitionTrip('idle', 'preparing')).toBe('preparing');
  expect(transitionTrip('tracking', 'paused')).toBe('paused');
  expect(transitionTrip('paused', 'approaching')).toBe('approaching');
  expect(transitionTrip('approaching', 'arrived')).toBe('arrived');
  expect(transitionTrip('arrived', 'completed')).toBe('completed');
  expect(transitionTrip('cancelled', 'preparing')).toBe('preparing');
});
it('rejects arrival before tracking and backwards completed trips', () => {
  expect(() => transitionTrip('idle', 'arrived')).toThrow(InvalidTripError);
  expect(() => transitionTrip('arrived', 'tracking')).toThrow(InvalidTripError);
});
