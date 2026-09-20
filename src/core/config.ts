import fs from 'node:fs';
import path from 'node:path';
import type { VendorId } from '../vendor/types.js';
import { VENDOR_IDS } from './version.js';
import { ensureLayout, paths } from './paths.js';
import { log } from '../ui/log.js';

export interface JvmConfig {
  version: 1;
  defaultVendor: VendorId;
  mirror: Partial<Record<VendorId, string | null>>;
}

export const DEFAULT_CONFIG: JvmConfig = {
  version: 1,
  defaultVendor: 'temurin',
  mirror: {},
};

export function loadConfig(): JvmConfig {
  const file = paths.config();
  if (!fs.existsSync(file)) return { ...DEFAULT_CONFIG, mirror: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<JvmConfig>;
    const config: JvmConfig = {
      version: 1,
      defaultVendor:
        parsed.defaultVendor && VENDOR_IDS.includes(parsed.defaultVendor)
          ? parsed.defaultVendor
          : 'temurin',
      mirror: {},
    };
    if (parsed.mirror && typeof parsed.mirror === 'object') {
      for (const id of VENDOR_IDS) {
        const v = parsed.mirror[id];
        if (typeof v === 'string' && v.length > 0) config.mirror[id] = v;
      }
    }
    return config;
  } catch (err) {
    const bak = `${file}.bak`;
    try {
      fs.renameSync(file, bak);
      log.warn(`config.json was corrupted; backed up to ${bak}, using defaults`);
    } catch {
      // 备份失败也继续用默认值
    }
    void err;
    return { ...DEFAULT_CONFIG, mirror: {} };
  }
}

export function saveConfig(config: JvmConfig): void {
  ensureLayout();
  const file = paths.config();
  const tmp = path.join(path.dirname(file), `.config.json.tmp-${process.pid}`);
  fs.writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`);
  fs.renameSync(tmp, file);
}
