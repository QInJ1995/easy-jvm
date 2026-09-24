import fs from 'node:fs';
import path from 'node:path';
import { JAVA_VENDOR_IDS } from './version.js';
import { ensureLayout, paths } from './paths.js';
import { log } from '../ui/log.js';

export interface SdkvmConfig {
  version: 1;
  defaultVendor: string;
  /** vendor id（跨全部 SDK 类型全局唯一）→ 镜像根 URL */
  mirror: Partial<Record<string, string | null>>;
}

export const DEFAULT_CONFIG: SdkvmConfig = {
  version: 1,
  defaultVendor: 'temurin',
  mirror: {},
};

export function loadConfig(): SdkvmConfig {
  const file = paths.config();
  if (!fs.existsSync(file)) return { ...DEFAULT_CONFIG, mirror: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<SdkvmConfig>;
    const config: SdkvmConfig = {
      version: 1,
      defaultVendor:
        parsed.defaultVendor && (JAVA_VENDOR_IDS as readonly string[]).includes(parsed.defaultVendor)
          ? parsed.defaultVendor
          : 'temurin',
      mirror: {},
    };
    if (parsed.mirror && typeof parsed.mirror === 'object') {
      for (const [id, v] of Object.entries(parsed.mirror)) {
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

export function saveConfig(config: SdkvmConfig): void {
  ensureLayout();
  const file = paths.config();
  const tmp = path.join(path.dirname(file), `.config.json.tmp-${process.pid}`);
  fs.writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`);
  fs.renameSync(tmp, file);
}
