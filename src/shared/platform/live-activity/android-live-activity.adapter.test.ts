import { expect, jest, test } from '@jest/globals';
import { type NaeryeoLiveUpdateModule } from '@modules/live-update';

import { createLiveActivityAdapter } from './android-live-activity.adapter';
import { type LiveActivityInput } from './live-activity.types';

jest.mock('@modules/live-update', () => ({ NaeryeoLiveUpdate: null }));

const input: LiveActivityInput = {
  id: 'poc-1', title: '강남역 · 3정거장', body: '다음 역 · 선릉', phase: 'tracking',
  totalStops: 3, completedStops: 0, alert: false,
};

// The adapter needs only these methods, not NativeModule's event emitter surface.
type Binding = Pick<NaeryeoLiveUpdateModule,
  'getStatus' | 'requestPermission' | 'openSettings' | 'startLiveActivity' | 'updateLiveActivity' | 'endLiveActivity'>;

function makeBinding(): Binding {
  return {
    getStatus: jest.fn<Binding['getStatus']>().mockResolvedValue({ sdkVersion: 36, notificationsEnabled: true,
      channelEnabled: true, liveUpdatesSupported: true, promotionAllowed: true, activeId: null, promoted: false }),
    requestPermission: jest.fn<Binding['requestPermission']>().mockResolvedValue({ granted: true }),
    openSettings: jest.fn<Binding['openSettings']>().mockResolvedValue(undefined),
    startLiveActivity: jest.fn<Binding['startLiveActivity']>().mockResolvedValue(undefined),
    updateLiveActivity: jest.fn<Binding['updateLiveActivity']>().mockResolvedValue(undefined),
    endLiveActivity: jest.fn<Binding['endLiveActivity']>().mockResolvedValue(undefined),
  };
}

test('unsupported platforms expose capabilities and reject operations', async () => {
  const port = createLiveActivityAdapter(null);
  expect(await port.getStatus()).toMatchObject({ available: false, liveUpdatesSupported: false });
  await expect(port.start(input)).rejects.toMatchObject({ code: 'unavailable' });
});

test('start, update, end and permissions cross the native boundary', async () => {
  const binding = makeBinding();
  const port = createLiveActivityAdapter(binding);
  await port.start(input);
  const next = { ...input, phase: 'approaching' as const, completedStops: 2 };
  await port.update(next);
  await port.end(input.id);
  expect(binding.startLiveActivity).toHaveBeenCalledWith(input);
  expect(binding.updateLiveActivity).toHaveBeenCalledWith(next);
  expect(binding.endLiveActivity).toHaveBeenCalledWith(input.id);
  expect(await port.requestPermission()).toBe(true);
  await port.openSettings('promotion');
  expect(binding.openSettings).toHaveBeenCalledWith(true);
  expect(await port.getStatus()).toMatchObject({ available: true, promoted: false });
});

test.each([
  { totalStops: 0 }, { completedStops: 0.5 }, { completedStops: 4 },
  { title: ' ' }, { id: '../trip' }, { chipText: '' }, { etaEpochMillis: NaN },
  { etaEpochMillis: 1.5 }, { phase: 'arrived' as const }, { phase: 'approaching' as const },
])('rejects invalid input before native start: %j', async (patch) => {
  const binding = makeBinding();
  await expect(createLiveActivityAdapter(binding).start({ ...input, ...patch }))
    .rejects.toMatchObject({ code: 'invalid-payload' });
  expect(binding.startLiveActivity).not.toHaveBeenCalled();
});

test('invalid updates and end ids never reach native code', async () => {
  const binding = makeBinding();
  const port = createLiveActivityAdapter(binding);
  await expect(port.update({ ...input, completedStops: -1 })).rejects.toMatchObject({ code: 'invalid-payload' });
  await expect(port.end('')).rejects.toMatchObject({ code: 'invalid-payload' });
  expect(binding.updateLiveActivity).not.toHaveBeenCalled();
  expect(binding.endLiveActivity).not.toHaveBeenCalled();
});

test('maps native failures to typed user-facing errors', async () => {
  const binding = makeBinding();
  jest.mocked(binding.startLiveActivity).mockRejectedValue({ code: 'ERR_PERMISSION_DENIED', message: 'native detail' });
  await expect(createLiveActivityAdapter(binding).start(input)).rejects.toMatchObject({
    code: 'permission-denied', message: '설정에서 내려의 알림을 허용해 주세요.',
  });
});
