import { useRef, useState } from 'react';
import { calculateTripProgress, type TripProgress, type TripSelection, type TransitDataPort, type TransitVehicle } from '@/entities/trip';
import { LiveActivityError, type LiveActivityPort } from '@/shared/platform/live-activity';
import { presentTrip } from './presentation';
interface Session { id: string; selection: TripSelection; vehicle: TransitVehicle; progress: TripProgress }
export function useLiveTrip(port: LiveActivityPort, data: TransitDataPort) {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  async function perform(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : '다시 시도해 주세요.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const start = (selection: TripSelection, vehicle: TransitVehicle) => perform(async () => {
    const status = await port.getStatus();
    if (!status.available) throw new LiveActivityError('unavailable');
    if (status.activeId) throw new LiveActivityError('already-active');
    if (!status.notificationsEnabled && !await port.requestPermission()) throw new LiveActivityError('permission-denied');
    if (!status.channelEnabled) throw new LiveActivityError('permission-denied');
    const latest = (await data.vehicles(selection.route.id)).find(v => v.vehicleId === vehicle.vehicleId);
    if (!latest) throw new Error('선택한 버스의 위치를 확인할 수 없어요. 차량을 다시 선택해 주세요.');
    const progress = calculateTripProgress(selection, latest, Date.now());
    if (progress.freshness === 'stale' || progress.phase === 'arrived' || latest.reachedSequence < selection.boardingSequence) throw new Error('현재 차량 위치에서 목적지를 다시 선택해 주세요.');
    const id = `trip-${Date.now()}`;
    const input = presentTrip(id, selection.route, progress, false);
    await port.start({ ...input, phase: 'tracking' });
    setSession({ id, selection, vehicle: latest, progress });
    if (progress.phase === 'approaching') await port.update({ ...input, alert: true });
  });
  const refresh = () => perform(async () => {
    if (!session || session.progress.phase === 'arrived') return;
    const latest = (await data.vehicles(session.selection.route.id)).find(v => v.vehicleId === session.vehicle.vehicleId);
    if (!latest) throw new Error('버스 위치 정보가 잠시 끊겼어요. 안내 방송도 함께 확인해 주세요.');
    if (latest.reachedSequence < session.vehicle.reachedSequence) throw new Error('버스 위치가 이전 순서로 바뀌었어요. 이동을 종료하고 다시 선택해 주세요.');
    const progress = calculateTripProgress(session.selection, latest, Date.now());
    // Public native lifecycle requires the approaching state before arrival.
    if (progress.phase === 'arrived' && session.progress.phase === 'tracking') {
      await port.update({ ...presentTrip(session.id, session.selection.route, progress, false),
        phase: 'approaching', completedStops: progress.totalStops - 1 });
    }
    await port.update(presentTrip(session.id, session.selection.route, progress, progress.phase !== session.progress.phase));
    setSession({ ...session, vehicle: latest, progress });
  });
  const end = () => perform(async () => {
    const id = session?.id ?? (await port.getStatus()).activeId;
    if (id) await port.end(id);
    setSession(null);
  });
  return { session, busy, error, start, refresh, end };
}
