import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { calculateTripProgress, type TripProgress, type TripSelection, type TransitDataPort, type TransitVehicle } from '@/entities/trip';
import { type LiveActivityPort } from '@/shared/platform/live-activity';
import type { TripTrackingPort, TrackingSnapshot } from '@/shared/platform/trip-tracking';
import { startTrackedTrip, endTrackedTrip } from './start-trip';
interface Session { id: string; selection: TripSelection; vehicle: TransitVehicle; progress: TripProgress; running: boolean }
function sessionFromSnapshot(snapshot: TrackingSnapshot): Session {
  const config = snapshot.config;
  const selection = { route: { id: config.routeId, name: config.routeName, direction: '', stops: config.stops },
    boardingSequence: config.boardingSequence, destinationSequence: config.destinationSequence };
  const vehicle = { routeId: config.routeId, vehicleId: config.vehicleId, registration: config.registration,
    reachedSequence: snapshot.reachedSequence, observedAt: snapshot.observedAt,
    currentStopId: config.stops.find(stop => stop.sequence === snapshot.reachedSequence)?.id ?? '' };
  return { id: config.id, selection, vehicle, progress: calculateTripProgress(selection, vehicle, Date.now()), running: snapshot.running };
}
export function useLiveTrip(port: LiveActivityPort, data: TransitDataPort, tracking: TripTrackingPort) {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    let active = true;
    let reading = false;
    const operationGeneration = generation;
    async function sync() {
      if (!active || reading || lock.current || AppState.currentState !== 'active') return;
      const expectedGeneration = operationGeneration.current;
      reading = true;
      try {
        const snapshot = await tracking.snapshot();
        if (!active || expectedGeneration !== operationGeneration.current || lock.current) return;
        setSession(snapshot ? sessionFromSnapshot(snapshot) : null);
        if (snapshot) setError(snapshot.error ?? (!snapshot.running && snapshot.phase !== 'arrived' ? '이동 추적이 중단됐어요. 이동을 종료하고 다시 시작해 주세요.' : null));
      } catch (e) { if (active && expectedGeneration === operationGeneration.current) setError(e instanceof Error ? e.message : '이동 상태를 확인하지 못했어요.'); }
      finally { reading = false; }
    }
    void sync();
    const timer = setInterval(() => void sync(), 2000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void sync(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [tracking]);
  async function perform(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; generation.current++; setBusy(true); setError(null);
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : '다시 시도해 주세요.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const start = (selection: TripSelection, vehicle: TransitVehicle) => perform(async () => {
    setSession(await startTrackedTrip(selection, vehicle, port, data, tracking));
  });
  const refresh = () => perform(async () => {
    const snapshot = await tracking.snapshot();
    setSession(snapshot ? sessionFromSnapshot(snapshot) : null);
    if (snapshot?.error) setError(snapshot.error);
  });
  const end = () => perform(async () => {
    await endTrackedTrip(session?.id ?? null, port, tracking);
    setSession(null);
  });
  return { session, busy, error, start, refresh, end };
}
