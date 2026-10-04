import { InvalidTripError } from './trip';
export type TripState = 'idle' | 'preparing' | 'tracking' | 'approaching' | 'arrived' |
  'completed' | 'error' | 'paused' | 'cancelled';
const allowed: Record<TripState, readonly TripState[]> = {
  idle: ['preparing'], preparing: ['tracking', 'error', 'cancelled'],
  tracking: ['approaching', 'paused', 'error', 'cancelled'],
  approaching: ['arrived', 'paused', 'error', 'cancelled'],
  arrived: ['completed', 'cancelled'], completed: ['preparing'],
  error: ['preparing', 'cancelled'], paused: ['tracking', 'approaching', 'error', 'cancelled'],
  cancelled: ['preparing'],
};
export function transitionTrip(from: TripState, to: TripState): TripState {
  if (!allowed[from].includes(to)) throw new InvalidTripError(`허용되지 않은 이동 상태: ${from} → ${to}`);
  return to;
}
