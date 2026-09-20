import type { Vendor, VendorId } from './types.js';
import { temurinVendor } from './temurin.js';
import { zuluVendor } from './zulu.js';
import { correttoVendor } from './corretto.js';
import type { JvmConfig } from '../core/config.js';
import { JvmError } from '../util/errors.js';

const REGISTRY: Record<VendorId, Vendor> = {
  temurin: temurinVendor,
  zulu: zuluVendor,
  corretto: correttoVendor,
};

export function getVendor(id: VendorId): Vendor {
  return REGISTRY[id];
}

export function allVendorIds(): VendorId[] {
  return ['temurin', 'zulu', 'corretto'];
}

/** CLI --vendor 参数 > 配置默认值 */
export function resolveVendorId(arg: string | undefined, config: JvmConfig): VendorId {
  const id = (arg ?? config.defaultVendor) as VendorId;
  if (!(id in REGISTRY)) {
    throw new JvmError(`Unknown vendor: ${arg}`, {
      hint: `Available vendors: ${Object.keys(REGISTRY).join(', ')}`,
    });
  }
  return id;
}

export type { Vendor, VendorId } from './types.js';
export type { VendorPlatform } from './types.js';
