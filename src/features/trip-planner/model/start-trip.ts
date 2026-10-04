import { calculateTripProgress, type TripProgress, type TripSelection, type TransitDataPort, type TransitVehicle } from '@/entities/trip';
import { LiveActivityError, type LiveActivityPort } from '@/shared/platform/live-activity';
import type { TripTrackingPort } from '@/shared/platform/trip-tracking';
export interface StartedTrip { id: string; selection: TripSelection; vehicle: TransitVehicle; progress: TripProgress; running: boolean }
export async function startTrackedTrip(selection: TripSelection, vehicle: TransitVehicle,
  port: LiveActivityPort, data: TransitDataPort, tracking: TripTrackingPort, now = Date.now): Promise<StartedTrip> {
  const status = await port.getStatus();
  if (!status.available) throw new LiveActivityError('unavailable');
  if (status.activeId) throw new LiveActivityError('already-active');
  if (!status.notificationsEnabled && !await port.requestPermission()) throw new LiveActivityError('permission-denied');
  if (!status.channelEnabled) throw new LiveActivityError('permission-denied');
  const latest = (await data.vehicles(selection.route.id)).find(v => v.vehicleId === vehicle.vehicleId);
  if (!latest) throw new Error('선택한 버스의 위치를 확인할 수 없어요. 차량을 다시 선택해 주세요.');
  const startedAt = now();
  const progress = calculateTripProgress(selection, latest, startedAt);
  if (progress.freshness === 'stale' || progress.phase === 'arrived' || latest.reachedSequence < selection.boardingSequence) throw new Error('현재 차량 위치에서 목적지를 다시 선택해 주세요.');
  const id = `trip-${startedAt}`;
  await tracking.start({ id, routeId: selection.route.id, routeName: selection.route.name,
    vehicleId: latest.vehicleId, registration: latest.registration, boardingSequence: selection.boardingSequence,
    destinationSequence: selection.destinationSequence, stops: selection.route.stops,
    initialSequence: latest.reachedSequence, initialObservedAt: latest.observedAt, startedAt,
    endpoint: data.trackingEndpoint(selection.route.id) });
  return { id, selection, vehicle: latest, progress, running: true };
}
export async function endTrackedTrip(id: string | null, port: LiveActivityPort, tracking: TripTrackingPort): Promise<void> {
  const activeId = id ?? (await port.getStatus()).activeId;
  if (activeId) { await tracking.end(activeId); await port.end(activeId); }
}
