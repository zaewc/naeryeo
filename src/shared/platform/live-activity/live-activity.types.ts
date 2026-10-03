/** Display-ready values only: no transit DTOs or Android classes cross this port. */
export interface LiveActivityInput {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly subtitle?: string;
  readonly chipText?: string;
  readonly phase: 'tracking' | 'approaching' | 'arrived';
  readonly totalStops: number;
  readonly completedStops: number;
  readonly etaEpochMillis?: number;
  readonly alert: boolean;
}

export interface LiveActivityStatus {
  readonly available: boolean;
  readonly sdkVersion: number | null;
  readonly notificationsEnabled: boolean;
  readonly channelEnabled: boolean;
  readonly liveUpdatesSupported: boolean;
  readonly promotionAllowed: boolean;
  readonly activeId: string | null;
  readonly promoted: boolean;
}

export type LiveActivityErrorCode =
  | 'unavailable' | 'invalid-payload' | 'permission-denied'
  | 'invalid-transition' | 'already-active' | 'not-active' | 'native-failure';

const MESSAGES: Record<LiveActivityErrorCode, string> = {
  unavailable: 'Android 개발 빌드에서 실행해 주세요.',
  'invalid-payload': '알림 정보가 올바르지 않아요.',
  'permission-denied': '설정에서 내려의 알림을 허용해 주세요.',
  'invalid-transition': '진행 상태를 다시 확인해 주세요.',
  'already-active': '기존 알림을 종료한 뒤 다시 시작해 주세요.',
  'not-active': '알림이 종료됐어요. 다시 시작해 주세요.',
  'native-failure': '알림을 처리하지 못했어요. 다시 시도해 주세요.',
};

export class LiveActivityError extends Error {
  constructor(readonly code: LiveActivityErrorCode, readonly detail?: unknown) {
    super(MESSAGES[code]);
    this.name = 'LiveActivityError';
  }
}

export interface LiveActivityPort {
  getStatus(): Promise<LiveActivityStatus>;
  requestPermission(): Promise<boolean>;
  openSettings(target: 'notifications' | 'promotion'): Promise<void>;
  start(input: LiveActivityInput): Promise<void>;
  update(input: LiveActivityInput): Promise<void>;
  end(id: string): Promise<void>;
}
