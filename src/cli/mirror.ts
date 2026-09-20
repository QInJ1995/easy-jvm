import { loadConfig, saveConfig } from '../core/config.js';
import { log } from '../ui/log.js';
import { JvmError } from '../util/errors.js';
import { allVendorIds } from '../vendor/index.js';

const RECOMMENDED = {
  temurin: 'https://mirrors.nju.edu.cn/adoptium',
} as const;

export function mirrorCommand(
  action: string | undefined,
  urlOrVendor: string | undefined,
  maybeUrl: string | undefined,
): void {
  const config = loadConfig();

  // jvm mirror set [vendor] <url> / jvm mirror unset [vendor] / jvm mirror show
  if (action === 'set') {
    let vendor: string;
    let url: string | undefined;
    if (maybeUrl !== undefined) {
      vendor = urlOrVendor ?? '';
      url = maybeUrl;
    } else {
      vendor = 'temurin';
      url = urlOrVendor;
    }
    if (!url) throw new JvmError('usage: jvm mirror set [vendor] <url>');
    if (vendor !== 'temurin') {
      throw new JvmError(`mirroring is only supported for temurin (got "${vendor}")`, {
        hint: `recommended: jvm mirror set temurin ${RECOMMENDED.temurin}`,
      });
    }
    try {
      new URL(url);
    } catch {
      throw new JvmError(`invalid URL: ${url}`);
    }
    config.mirror.temurin = url.replace(/\/+$/, '');
    saveConfig(config);
    log.ok(`mirror for temurin → ${config.mirror.temurin}`);
    return;
  }

  if (action === 'unset') {
    const vendor = urlOrVendor ?? 'temurin';
    if (vendor !== 'temurin') throw new JvmError(`mirroring is only supported for temurin`);
    config.mirror.temurin = null;
    saveConfig(config);
    log.ok('mirror for temurin cleared (official source)');
    return;
  }

  // show / 无参数
  log.raw('mirrors:');
  for (const id of allVendorIds()) {
    const url = config.mirror[id];
    log.raw(`  ${id.padEnd(8)} ${url ?? '(official)'}`);
  }
  log.raw(`recommended for CN users: jvm mirror set temurin ${RECOMMENDED.temurin}`);
}
