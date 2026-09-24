import type { SdkTypeId, SdkTypeSpec } from './types.js';
import { javaSdk } from './java.js';
import { SdkvmError } from '../util/errors.js';

const SPECS: Partial<Record<SdkTypeId, SdkTypeSpec>> = {
  java: javaSdk,
};

/** 已注册的 SDK 类型（current/迁移等需要遍历全部类型时使用） */
export const SDK_TYPES: readonly SdkTypeId[] = ['java'];

export function getSdkType(id: SdkTypeId): SdkTypeSpec {
  const spec = SPECS[id];
  if (!spec) throw new SdkvmError(`Unknown SDK type: ${id}`);
  return spec;
}
