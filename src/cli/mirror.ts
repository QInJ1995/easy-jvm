import { loadConfig, saveConfig } from '../core/config.js';
import { log } from '../ui/log.js';
import { SdkvmError } from '../util/errors.js';
import { allVendorIds } from '../vendor/index.js';
import type { SdkTypeId } from '../sdk/types.js';
import { cmdPath } from './cmdname.js';

/** 支持镜像的 vendor → 推荐镜像根 URL */
const RECOMMENDED: Record<string, string> = {
  temurin: 'https://mirrors.nju.edu.cn/adoptium',
};

export function mirrorCommand(
  type: SdkTypeId,
  action: string | undefined,
  urlOrVendor: string | undefined,
  maybeUrl: string | undefined,
): void {
  const config = loadConfig();
  const mirrorable = allVendorIds(type).filter((id) => id in RECOMMENDED);
  const first = mirrorable[0] ?? allVendorIds(type)[0] ?? '';

  // <cmd> mirror set [vendor] <url> / unset [vendor] / show
  if (action === 'set') {
    let vendor: string;
    let url: string | undefined;
    if (maybeUrl !== undefined) {
      vendor = urlOrVendor ?? '';
      url = maybeUrl;
    } else {
      vendor = first;
      url = urlOrVendor;
    }
    if (!url) throw new SdkvmError(`usage: ${cmdPath(type)} mirror set [vendor] <url>`);
    if (!mirrorable.includes(vendor)) {
      throw new SdkvmError(`mirroring is only supported for ${mirrorable.join(', ') || 'none'} (got "${vendor}")`, {
        hint: `recommended: ${cmdPath(type)} mirror set ${first} ${RECOMMENDED[first] ?? ''}`.trim(),
      });
    }
    try {
      new URL(url);
    } catch {
      throw new SdkvmError(`invalid URL: ${url}`);
    }
    config.mirror[vendor] = url.replace(/\/+$/, '');
    saveConfig(config);
    log.ok(`mirror for ${vendor} → ${config.mirror[vendor]}`);
    return;
  }

  if (action === 'unset') {
    const vendor = urlOrVendor ?? first;
    if (!mirrorable.includes(vendor)) {
      throw new SdkvmError(`mirroring is only supported for ${mirrorable.join(', ') || 'none'}`);
    }
    config.mirror[vendor] = null;
    saveConfig(config);
    log.ok(`mirror for ${vendor} cleared (official source)`);
    return;
  }

  // show / 无参数
  log.raw('mirrors:');
  for (const id of allVendorIds(type)) {
    const url = config.mirror[id];
    log.raw(`  ${id.padEnd(8)} ${url ?? '(official)'}`);
  }
  if (first in RECOMMENDED) {
    log.raw(`recommended for CN users: ${cmdPath(type)} mirror set ${first} ${RECOMMENDED[first]}`);
  }
}
