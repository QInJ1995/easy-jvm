import type { SdkTypeId } from '../sdk/types.js';
import type { Vendor } from './types.js';
import { temurinVendor } from './temurin.js';
import { zuluVendor } from './zulu.js';
import { correttoVendor } from './corretto.js';
import type { SdkvmConfig } from '../core/config.js';
import { SdkvmError } from '../util/errors.js';

/** 按 SDK 类型分组的有序厂商表（[0] 为该类型默认厂商） */
export const JAVA_VENDORS: readonly Vendor[] = [temurinVendor, zuluVendor, correttoVendor];

export function vendorsFor(type: SdkTypeId): readonly Vendor[] {
  if (type === 'java') return JAVA_VENDORS;
  throw new SdkvmError(`Unknown SDK type: ${type}`);
}

export function allVendorIds(type: SdkTypeId): string[] {
  return vendorsFor(type).map((v) => v.id);
}

export function getVendor(type: SdkTypeId, id: string): Vendor {
  const vendor = vendorsFor(type).find((v) => v.id === id);
  if (!vendor) {
    throw new SdkvmError(`Unknown vendor: ${id}`, {
      hint: `Available vendors for ${type}: ${allVendorIds(type).join(', ')}`,
    });
  }
  return vendor;
}

/** CLI --vendor 参数 > 配置默认值（defaultVendor 仅 java 有意义；其余类型取 [0]） */
export function resolveVendorId(type: SdkTypeId, arg: string | undefined, config: SdkvmConfig): string {
  const vendors = vendorsFor(type);
  const id = arg ?? (type === 'java' ? config.defaultVendor : vendors[0]?.id);
  const found = vendors.find((v) => v.id === id);
  if (!found) {
    throw new SdkvmError(`Unknown vendor: ${arg}`, {
      hint: `Available vendors: ${vendors.map((v) => v.id).join(', ')}`,
    });
  }
  return found.id;
}

export type { Vendor } from './types.js';
export type { VendorPlatform } from './types.js';
