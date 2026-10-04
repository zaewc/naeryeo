import { useRef, useState } from 'react';
import { calculateTripProgress, type TripSelection, type TripProgress } from '@/entities/trip';
import { LiveActivityError, type LiveActivityPort } from '@/shared/platform/live-activity';
import { presentTrip } from './presentation';
interface Session { readonly id: string; readonly selection: TripSelection; readonly reachedSequence: number; readonly progress: TripProgress }
export function useDemoTrip(port: LiveActivityPort) {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  async function perform(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { await work(); } catch (e) {
      setError(e instanceof LiveActivityError ? e.message : e instanceof Error ? e.message : '다시 시도해 주세요.');
    } finally { lock.current = false; setBusy(false); }
  }
  const start = (selection: TripSelection) => perform(async () => {
    const status = await port.getStatus();
    if (!status.available) throw new LiveActivityError('unavailable');
    if (!status.notificationsEnabled && !await port.requestPermission()) throw new LiveActivityError('permission-denied');
    if (!status.channelEnabled) throw new LiveActivityError('permission-denied');
    if (status.activeId) throw new LiveActivityError('already-active');
    const now = Date.now();
    const id = `demo-trip-${now}`;
    const progress = calculateTripProgress(selection, { vehicleId: 'demo:bus', routeId: selection.route.id,
      reachedSequence: selection.boardingSequence, observedAt: now }, now);
    const input = presentTrip(id, selection.route, progress, false);
    await port.start({ ...input, phase: 'tracking' });
    if (progress.phase === 'approaching') await port.update({ ...input, alert: true });
    setSession({ id, selection, progress, reachedSequence: selection.boardingSequence });
  });
  const advance = () => perform(async () => {
    if (!session || session.progress.phase === 'arrived') return;
    const next = session.progress.nextStop;
    if (!next) return;
    const now = Date.now();
    const progress = calculateTripProgress(session.selection, { vehicleId: 'demo:bus', routeId: session.selection.route.id,
      reachedSequence: next.sequence, observedAt: now }, now);
    await port.update(presentTrip(session.id, session.selection.route, progress, progress.phase !== session.progress.phase));
    setSession({ ...session, reachedSequence: next.sequence, progress });
  });
  const end = () => perform(async () => {
    const activeId = session?.id ?? (await port.getStatus()).activeId;
    if (activeId) await port.end(activeId);
    setSession(null);
  });
  const settings = () => perform(() => port.openSettings('notifications'));
  return { session, busy, error, start, advance, end, settings };
}
