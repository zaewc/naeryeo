import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { LiveActivityError, type LiveActivityPort, type LiveActivityStatus } from '@/shared/platform/live-activity';

import { getPocStep } from './scenario';

export function useNowBarPoc(port: LiveActivityPort) {
  const [status, setStatus] = useState<LiveActivityStatus | null>(null);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);

  const refresh = useCallback(async () => {
    const next = await port.getStatus();
    setStatus(next);
    if (next.activeId === null) setStepIndex(null);
  }, [port]);

  const run = useCallback(async (operation: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try { await operation(); }
    catch (failure: unknown) {
      setError(failure instanceof LiveActivityError ? failure.message : '상태를 확인하지 못했어요. 다시 시도해 주세요.');
    } finally { locked.current = false; setBusy(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void port.getStatus().then(next => {
      if (!cancelled) setStatus(next);
    }).catch(() => {
      if (!cancelled) setError('기기 상태를 확인하지 못했어요. 다시 시도해 주세요.');
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run(refresh);
    });
    return () => { cancelled = true; subscription.remove(); };
  }, [port, refresh, run]);

  return {
    status, busy, error,
    step: stepIndex === null ? undefined : getPocStep(stepIndex),
    canAdvance: stepIndex !== null && getPocStep(stepIndex + 1) !== undefined,
    refresh: () => run(refresh),
    requestPermission: () => run(async () => { await port.requestPermission(); await refresh(); }),
    openSettings: (target: 'notifications' | 'promotion') => run(() => port.openSettings(target)),
    start: () => run(async () => {
      const first = getPocStep(0);
      if (!first) return;
      await port.start(first);
      setStepIndex(0);
      await refresh();
    }),
    advance: () => run(async () => {
      if (stepIndex === null) return;
      const nextIndex = stepIndex + 1;
      const next = getPocStep(nextIndex);
      if (!next) return;
      await port.update(next);
      setStepIndex(nextIndex);
      await refresh();
    }),
    end: () => run(async () => {
      if (status?.activeId) await port.end(status.activeId);
      setStepIndex(null);
      await refresh();
    }),
  };
}
