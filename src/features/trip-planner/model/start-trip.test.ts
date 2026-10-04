import { expect, it, jest } from '@jest/globals';
import type { TransitDataPort, TransitVehicle } from '@/entities/trip';
import type { LiveActivityPort } from '@/shared/platform/live-activity';
import type { TripTrackingPort } from '@/shared/platform/trip-tracking';
import { demoRoute } from './demo-route';
import { startTrackedTrip, endTrackedTrip } from './start-trip';
const vehicle: TransitVehicle = { vehicleId: 'selected', routeId: demoRoute.id, reachedSequence: 10, observedAt: 1000, registration: '선택 차량', currentStopId: 'a' };
const selection = { route: demoRoute, boardingSequence: 10, destinationSequence: 50 };
function ports(granted = true) {
  const port: LiveActivityPort = { getStatus: async () => ({ available: true, sdkVersion: 36, notificationsEnabled: granted, channelEnabled: true, liveUpdatesSupported: true, promotionAllowed: true, activeId: null, promoted: false }),
    requestPermission: jest.fn<LiveActivityPort['requestPermission']>().mockResolvedValue(granted), openSettings: jest.fn<LiveActivityPort['openSettings']>(),
    start: jest.fn<LiveActivityPort['start']>(), update: jest.fn<LiveActivityPort['update']>(), end: jest.fn<LiveActivityPort['end']>() };
  const data: TransitDataPort = { routes: jest.fn<TransitDataPort['routes']>(), route: jest.fn<TransitDataPort['route']>(),
    vehicles: jest.fn<TransitDataPort['vehicles']>().mockResolvedValue([{ ...vehicle, vehicleId: 'other', reachedSequence: 40 }, { ...vehicle, reachedSequence: 20 }]), trackingEndpoint: () => 'https://example.test/routes/1/vehicles' };
  const tracking: TripTrackingPort = { start: jest.fn<TripTrackingPort['start']>().mockResolvedValue(undefined), snapshot: jest.fn<TripTrackingPort['snapshot']>(), end: jest.fn<TripTrackingPort['end']>().mockResolvedValue(undefined) };
  return { port, data, tracking };
}
it('starts from a fresh observation of the selected vehicle, not the first bus on the route', async () => {
  const p = ports(); const result = await startTrackedTrip(selection, vehicle, p.port, p.data, p.tracking, () => 1000);
  expect(result.progress.remainingStops).toBe(3);
  expect(p.tracking.start).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: 'selected', initialSequence: 20, destinationSequence: 50 }));
  expect(p.port.start).not.toHaveBeenCalled();
});
it('does not fetch or start a trip after notification permission is denied', async () => {
  const p = ports(false);
  await expect(startTrackedTrip(selection, vehicle, p.port, p.data, p.tracking)).rejects.toMatchObject({ code: 'permission-denied' });
  expect(p.data.vehicles).not.toHaveBeenCalled(); expect(p.tracking.start).not.toHaveBeenCalled();
});
it('rejects a destination already reached while choosing stops', async () => {
  const p = ports();
  await expect(startTrackedTrip({ ...selection, destinationSequence: 20 }, vehicle, p.port, p.data, p.tracking, () => 1000)).rejects.toThrow('목적지를 다시 선택');
  expect(p.tracking.start).not.toHaveBeenCalled();
});
it('cancels the native tracker and its notification, and is harmless when idle', async () => {
  const p = ports(); await endTrackedTrip('trip-1000', p.port, p.tracking);
  expect(p.tracking.end).toHaveBeenCalledWith('trip-1000'); expect(p.port.end).toHaveBeenCalledWith('trip-1000');
  jest.clearAllMocks(); await endTrackedTrip(null, p.port, p.tracking);
  expect(p.tracking.end).not.toHaveBeenCalled(); expect(p.port.end).not.toHaveBeenCalled();
});
