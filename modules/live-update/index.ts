import { type NativeModule, requireOptionalNativeModule } from 'expo';

/**
 * Raw binding to the Android-only `NaeryeoLiveUpdate` native module.
 *
 * Only `src/shared/platform` may import this file (enforced by ESLint and
 * dependency-cruiser). Resolves to `null` on platforms without the module.
 */
export interface NativeLiveUpdateInput {
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

export interface NativeLiveUpdateStatus {
  readonly sdkVersion: number;
  readonly notificationsEnabled: boolean;
  readonly channelEnabled: boolean;
  readonly liveUpdatesSupported: boolean;
  readonly promotionAllowed: boolean;
  readonly activeId: string | null;
  readonly promoted: boolean;
}

export interface NaeryeoLiveUpdateModule extends NativeModule {
  getStatus(): Promise<NativeLiveUpdateStatus>;
  requestPermission(): Promise<{ granted: boolean }>;
  openSettings(promotion: boolean): Promise<void>;
  startLiveActivity(input: NativeLiveUpdateInput): Promise<void>;
  updateLiveActivity(input: NativeLiveUpdateInput): Promise<void>;
  endLiveActivity(id: string): Promise<void>;
}

export const NaeryeoLiveUpdate = requireOptionalNativeModule<NaeryeoLiveUpdateModule>('NaeryeoLiveUpdate');
