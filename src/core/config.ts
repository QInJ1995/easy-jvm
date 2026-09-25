import fs from 'node:fs';
import path from 'node:path';
import { JAVA_VENDOR_IDS } from './version.js';
import { acquireLock, releaseLock } from './lock.js';
import { ensureLayout, paths } from './paths.js';
import { log } from '../ui/log.js';

export interface SdkvmConfig {
  version: 1;
  defaultVendor: string;
  /** vendor id（跨全部 SDK 类型全局唯一）→ 镜像根 URL */
  mirror: Partial<Record<string, string | null>>;
  /** 用户自定义 npm registry 名 → URL（sdkvm nrm add/del） */
  npmRegistries: Record<string, string>;
}

export const DEFAULT_CONFIG: SdkvmConfig = {
  version: 1,
  defaultVendor: 'temurin',
  mirror: {},
  npmRegistries: {},
};

export function loadConfig(): SdkvmConfig {
  const file = paths.config();
  if (!fs.existsSync(file)) return { ...DEFAULT_CONFIG, mirror: {}, npmRegistries: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<SdkvmConfig>;
    const config: SdkvmConfig = {
      version: 1,
      defaultVendor:
        parsed.defaultVendor && (JAVA_VENDOR_IDS as readonly string[]).includes(parsed.defaultVendor)
          ? parsed.defaultVendor
          : 'temurin',
      mirror: {},
      npmRegistries: {},
    };
    if (parsed.mirror && typeof parsed.mirror === 'object') {
      for (const [id, v] of Object.entries(parsed.mirror)) {
        if (typeof v === 'string' && v.length > 0) config.mirror[id] = v;
      }
    }
    if (parsed.npmRegistries && typeof parsed.npmRegistries === 'object') {
      for (const [id, v] of Object.entries(parsed.npmRegistries)) {
        if (typeof v === 'string' && v.length > 0) config.npmRegistries[id] = v;
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
    return { ...DEFAULT_CONFIG, mirror: {}, npmRegistries: {} };
  }
}

export function saveConfig(config: SdkvmConfig): void {
  ensureLayout();
  const file = paths.config();
  const tmp = path.join(path.dirname(file), `.config.json.tmp-${process.pid}`);
  fs.writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

/**
 * 在全局锁内读-改-写 config，避免 mirror/nrm 并发丢更新。
 * 调用方勿在已持有 withLock 的回调里再调（非可重入）。
 */
export function updateConfig(mutator: (config: SdkvmConfig) => void): SdkvmConfig {
  acquireLock();
  try {
    const config = loadConfig();
    mutator(config);
    saveConfig(config);
    return config;
  } finally {
    releaseLock();
  }
}
