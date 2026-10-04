export interface TransitStop {
  readonly id: string;
  readonly name: string;
  /** Provider route sequence, not station identity. */
  readonly sequence: number;
}

export interface TransitRoute {
  readonly id: string;
  readonly name: string;
  readonly direction: string;
  readonly stops: readonly TransitStop[];
}

export class InvalidTripError extends Error {
  constructor(message: string) { super(message); this.name = 'InvalidTripError'; }
}

export interface TripSelection {
  readonly route: TransitRoute;
  readonly boardingSequence: number;
  readonly destinationSequence: number;
}

export interface VehicleObservation {
  readonly vehicleId: string;
  readonly routeId: string;
  /** Sequence of the stop reached/passed by this vehicle. */
  readonly reachedSequence: number;
  readonly observedAt: number;
  readonly etaEpochMillis?: number;
}

export interface TripProgress {
  readonly totalStops: number;
  readonly completedStops: number;
  readonly remainingStops: number;
  readonly nextStop: TransitStop | null;
  readonly destination: TransitStop;
  readonly phase: 'tracking' | 'approaching' | 'arrived';
  readonly freshness: 'live' | 'stale';
  readonly observedAt: number;
  readonly etaEpochMillis?: number;
}

export function validateSelection(input: TripSelection): void {
  const { stops } = input.route;
  if (!input.route.id || !stops.length || stops.some((stop, i) =>
    !stop.id || !Number.isInteger(stop.sequence) || (i > 0 && stop.sequence <= (stops[i - 1]?.sequence ?? Infinity)))) {
    throw new InvalidTripError('노선 정류장 순서가 올바르지 않습니다.');
  }
  if (!stops.some(s => s.sequence === input.boardingSequence) ||
      !stops.some(s => s.sequence === input.destinationSequence) ||
      input.boardingSequence >= input.destinationSequence) {
    throw new InvalidTripError('탑승 정류장 이후의 목적지를 선택해 주세요.');
  }
}

export function calculateTripProgress(selection: TripSelection, observation: VehicleObservation,
  now: number, staleAfterMs = 60_000): TripProgress {
  validateSelection(selection);
  if (observation.routeId !== selection.route.id || !observation.vehicleId ||
      !Number.isInteger(observation.reachedSequence) ||
      !selection.route.stops.some(s => s.sequence === observation.reachedSequence) ||
      !Number.isFinite(observation.observedAt) || !Number.isFinite(now) ||
      observation.observedAt > now || !Number.isFinite(staleAfterMs) || staleAfterMs <= 0 ||
      (observation.etaEpochMillis !== undefined && !Number.isFinite(observation.etaEpochMillis))) {
    throw new InvalidTripError('차량 위치 정보를 확인할 수 없습니다.');
  }
  const destination = selection.route.stops.find(s => s.sequence === selection.destinationSequence);
  if (!destination) throw new InvalidTripError('목적지 정류장을 확인할 수 없습니다.');
  const journey = selection.route.stops.filter(s => s.sequence > selection.boardingSequence &&
    s.sequence <= selection.destinationSequence);
  const completedStops = journey.filter(s => s.sequence <= observation.reachedSequence).length;
  const remainingStops = journey.length - completedStops;
  const freshness = now - observation.observedAt > staleAfterMs ? 'stale' : 'live';
  return {
    totalStops: journey.length, completedStops, remainingStops, destination,
    nextStop: journey.find(s => s.sequence > observation.reachedSequence) ?? null,
    phase: remainingStops === 0 ? 'arrived' : remainingStops === 1 ? 'approaching' : 'tracking',
    freshness, observedAt: observation.observedAt,
    etaEpochMillis: freshness === 'live' && observation.etaEpochMillis !== undefined &&
      observation.etaEpochMillis >= now ? observation.etaEpochMillis : undefined,
  };
}
