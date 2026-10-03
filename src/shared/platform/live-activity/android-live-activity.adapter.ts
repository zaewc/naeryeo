import { NaeryeoLiveUpdate, type NaeryeoLiveUpdateModule } from '@modules/live-update';

import {
  LiveActivityError, type LiveActivityErrorCode, type LiveActivityInput, type LiveActivityPort,
} from './live-activity.types';
import { validateId, validateInput } from './validation';

const ERROR_CODES: Record<string, LiveActivityErrorCode> = {
  ERR_INVALID_PAYLOAD: 'invalid-payload',
  ERR_PERMISSION_DENIED: 'permission-denied',
  ERR_INVALID_TRANSITION: 'invalid-transition',
  ERR_ALREADY_ACTIVE: 'already-active',
  ERR_NOT_ACTIVE: 'not-active',
  ERR_UNAVAILABLE: 'unavailable',
};

/** Inject the binding for contract tests; features receive only LiveActivityPort. */
type LiveUpdateBinding = Pick<NaeryeoLiveUpdateModule,
  'getStatus' | 'requestPermission' | 'openSettings' | 'startLiveActivity' | 'updateLiveActivity' | 'endLiveActivity'>;

export function createLiveActivityAdapter(binding: LiveUpdateBinding | null = NaeryeoLiveUpdate): LiveActivityPort {
  function requireBinding(): LiveUpdateBinding {
    if (!binding) throw new LiveActivityError('unavailable');
    return binding;
  }

  async function call<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error: unknown) {
      if (error instanceof LiveActivityError) throw error;
      const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
        ? ERROR_CODES[error.code] : undefined;
      throw new LiveActivityError(code ?? 'native-failure', error);
    }
  }

  const post = (method: 'startLiveActivity' | 'updateLiveActivity', input: LiveActivityInput) => call(async () => {
    validateInput(input);
    await requireBinding()[method](input);
  });

  return {
    async getStatus() {
      if (!binding) return {
        available: false, sdkVersion: null, notificationsEnabled: false, channelEnabled: false,
        liveUpdatesSupported: false, promotionAllowed: false, activeId: null, promoted: false,
      };
      return call(async () => ({ ...await binding.getStatus(), available: true }));
    },
    requestPermission: () => call(async () => (await requireBinding().requestPermission()).granted),
    openSettings: (target) => call(() => requireBinding().openSettings(target === 'promotion')),
    start: (input) => post('startLiveActivity', input),
    update: (input) => post('updateLiveActivity', input),
    end: (id) => call(async () => {
      validateId(id);
      await requireBinding().endLiveActivity(id);
    }),
  };
}
