import { NaeryeoLiveUpdate } from '@modules/live-update';
import { LiveActivityError } from '../live-activity';
export interface TrackingStopInput { readonly id: string; readonly name: string; readonly sequence: number }
export interface TrackingConfigInput {
  readonly id: string; readonly routeId: string; readonly routeName: string; readonly vehicleId: string;
  readonly registration: string; readonly boardingSequence: number; readonly destinationSequence: number;
  readonly stops: readonly TrackingStopInput[]; readonly endpoint: string; readonly initialSequence: number;
  readonly initialObservedAt: number; readonly startedAt: number;
}
export interface TrackingSnapshot { readonly config: TrackingConfigInput; readonly reachedSequence: number; readonly observedAt: number;
  readonly phase: 'tracking' | 'approaching' | 'arrived'; readonly error: string | null; readonly running: boolean }
export interface TripTrackingPort {
  start(config: TrackingConfigInput): Promise<void>;
  snapshot(): Promise<TrackingSnapshot | null>;
  end(id: string): Promise<void>;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LiveActivityError('invalid-payload');
  return value as Record<string, unknown>;
}
function text(value: unknown): string { if (typeof value !== 'string' || !value) throw new LiveActivityError('invalid-payload'); return value; }
function integer(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new LiveActivityError('invalid-payload'); return value; }
export function parseTrackingSnapshot(json: string): TrackingSnapshot {
  const value = object(JSON.parse(json)); const c = object(value['config']);
  const stops = c['stops']; if (!Array.isArray(stops)) throw new LiveActivityError('invalid-payload');
  const phase = value['phase']; if (phase !== 'tracking' && phase !== 'approaching' && phase !== 'arrived') throw new LiveActivityError('invalid-payload');
  const running = value['running']; if (typeof running !== 'boolean') throw new LiveActivityError('invalid-payload');
  const error = value['error']; if (error !== null && typeof error !== 'string') throw new LiveActivityError('invalid-payload');
  return { config: { id: text(c['id']), routeId: text(c['routeId']), routeName: text(c['routeName']), vehicleId: text(c['vehicleId']),
    registration: text(c['registration']), boardingSequence: integer(c['boardingSequence']), destinationSequence: integer(c['destinationSequence']),
    endpoint: text(c['endpoint']), initialSequence: integer(c['initialSequence']), initialObservedAt: integer(c['initialObservedAt']), startedAt: integer(c['startedAt']),
    stops: stops.map(stop => { const item = object(stop); return { id: text(item['id']), name: text(item['name']), sequence: integer(item['sequence']) }; }) },
    reachedSequence: integer(value['reachedSequence']), observedAt: integer(value['observedAt']), phase, running, error };
}
export function createTripTrackingAdapter(): TripTrackingPort {
  function binding() { if (!NaeryeoLiveUpdate) throw new LiveActivityError('unavailable'); return NaeryeoLiveUpdate; }
  return {
    async start(config) { try { await binding().startTripTracking(JSON.stringify(config)); }
      catch (error) { if (error instanceof LiveActivityError) throw error; throw new LiveActivityError('native-failure'); } },
    async snapshot() { if (!NaeryeoLiveUpdate) return null; const json = await binding().getTripTracking(); return json === null ? null : parseTrackingSnapshot(json); },
    async end(id) { await binding().endTripTracking(id); },
  };
}
