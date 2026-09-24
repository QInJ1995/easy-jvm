import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { paths, sdkvmHome } from './paths.js';
import { envOverride } from './env.js';
import { detectPlatform, type Platform } from './platform.js';
import { setCurrent } from '../fs/link.js';
import { detectRcFile } from '../shell/detect.js';
import { LEGACY_RC_BEGIN, upsertRcFile } from '../shell/rc.js';
import { setSdkEnvWin } from '../shell/winenv.js';
import { log } from '../ui/log.js';

export type MigrationResult = 'not-needed' | 'migrated' | 'conflict';

export interface MigrateOptions {
  /** 旧根目录（默认 ~/.jvm） */
  oldHome?: string;
  /** 新根目录（默认 ~/.sdkvm 或 SDKVM_HOME/JVM_HOME） */
  newHome?: string;
  /** 覆盖 rc 文件探测（测试用；null 表示跳过 rc 处理） */
  rcFile?: string | null;
  platform?: Platform;
}

/**
 * easy-jvm 时代的 ~/.jvm → ~/.sdkvm 一次性迁移（幂等）。
 * 任何一步修复失败都不回滚——rename 之后数据本体已安全，修复可由下次 use 兜底。
 */
export async function migrateLegacyHomeIfNeeded(opts: MigrateOptions = {}): Promise<MigrationResult> {
  const oldHome = opts.oldHome ?? path.join(os.homedir(), '.jvm');
  const newHome = opts.newHome ?? sdkvmHome();

  // 用户显式钉住了根目录（新名或旧名环境变量）→ 该目录不是 ~/.jvm，无需迁移
  if (opts.newHome === undefined && envOverride('SDKVM_HOME', 'JVM_HOME')) return 'not-needed';
  if (!fs.existsSync(oldHome)) return 'not-needed';
  if (fs.existsSync(newHome)) {
    log.warn(`found both ${oldHome} and ${newHome}; keeping ${newHome}, not merging`);
    log.warn(`move SDKs into ${newHome} manually if needed, then remove ${oldHome}`);
    return 'conflict';
  }

  const platform = opts.platform ?? detectPlatform();
  const rc = opts.rcFile !== undefined ? opts.rcFile : detectRcFile(platform.os);

  // 并发保护：有活跃锁时放弃本次迁移（锁随目录一起改名会悬空）
  const oldLock = path.join(oldHome, '.lock');
  if (fs.existsSync(oldLock)) {
    const stat = fs.statSync(oldLock);
    if (Date.now() - stat.mtimeMs <= 5 * 60 * 1000) {
      log.warn('another sdkvm operation seems in progress; skipping migration this run');
      return 'not-needed';
    }
  }

  // 1) 同卷原子改名：jdks/ config.json cache/ 原样保留
  fs.renameSync(oldHome, newHome);

  // 后续步骤全部经 paths 寻址：迁移期间把根目录钉到 newHome
  const prevHome = process.env.SDKVM_HOME;
  process.env.SDKVM_HOME = newHome;
  try {
    await fixupAfterRename(oldHome, newHome, platform, rc);
  } finally {
    if (prevHome === undefined) delete process.env.SDKVM_HOME;
    else process.env.SDKVM_HOME = prevHome;
  }

  log.ok(`migrated ${oldHome} → ${newHome} (your installed JDKs are untouched)`);
  return 'migrated';
}

/** rename 之后的修复步骤：current 链接重写、Windows 注册表、rc 块替换（均 best-effort） */
async function fixupAfterRename(
  oldHome: string,
  newHome: string,
  platform: Platform,
  rc: string | null,
): Promise<void> {
  // 2) 修复 current 链接：绝对目标随改名悬空；重写前缀后以新名 current-java 重建
  try {
    const oldLink = path.join(newHome, 'current');
    let target: string | null = null;
    try {
      const st = fs.lstatSync(oldLink);
      if (st.isSymbolicLink()) {
        target = path.resolve(path.dirname(oldLink), fs.readlinkSync(oldLink) as string);
      }
    } catch {
      // 无旧链接
    }
    if (target) {
      const newTarget = target.startsWith(oldHome) ? newHome + target.slice(oldHome.length) : target;
      if (fs.existsSync(newTarget)) setCurrent('java', newTarget, platform);
    }
    try {
      fs.rmSync(oldLink, { force: true });
    } catch {
      fs.rmSync(oldLink, { recursive: true, force: true });
    }
  } catch (err) {
    log.warn(
      `current link not migrated (${err instanceof Error ? err.message : String(err)}); run: sdkvm java use <version>`,
    );
  }

  // 3) Windows 注册表：JAVA_HOME 的字面值指向旧路径，需重写
  if (platform.os === 'windows') {
    try {
      await setSdkEnvWin('java');
    } catch (err) {
      log.warn(`registry JAVA_HOME not updated: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 4) rc 文件：旧 jvm init 块原位替换为新 java 块（无旧块的文件不动）
  if (rc && fs.existsSync(rc)) {
    try {
      if (fs.readFileSync(rc, 'utf8').includes(LEGACY_RC_BEGIN)) upsertRcFile(rc, 'java');
    } catch {
      log.warn(`rc file not updated: ${rc}`);
    }
  }
}
