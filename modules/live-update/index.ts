import { type NativeModule, requireOptionalNativeModule } from 'expo';

/**
 * Raw binding to the Android-only `NaeryeoLiveUpdate` native module.
 *
 * Only `src/shared/platform` may import this file (enforced by ESLint and
 * dependency-cruiser). Resolves to `null` on platforms without the module.
 */
export type NaeryeoLiveUpdateModule = NativeModule;

export const NaeryeoLiveUpdate = requireOptionalNativeModule<NaeryeoLiveUpdateModule>('NaeryeoLiveUpdate');
