import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { detectPlatform, type Platform } from '../core/platform.js';
import { findInstalled } from '../core/registry.js';
import { setCurrent } from '../fs/link.js';
import { getSdkType } from '../sdk/index.js';
import type { SdkTypeId } from '../sdk/types.js';
import { detectRcFile } from '../shell/detect.js';
import { rcBlock, upsertRcFile } from '../shell/rc.js';
import { ensureUserPathWin, setSdkEnvWin, sdkPathEntry } from '../shell/winenv.js';
import { log } from '../ui/log.js';

const execFileAsync = promisify(execFile);

async function showSdkVersion(binPath: string, type: SdkTypeId): Promise<void> {
  const spec = getSdkType(type);
  try {
    const { stdout, stderr } = await execFileAsync(binPath, spec.versionCheck.args, {
      timeout: 30_000,
    });
    const text = (spec.versionCheck.stream === 'stdout' ? stdout : stderr) || '';
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const line = lines.find((l) => /version/i.test(l)) ?? lines[0];
    if (line) log.info(line);
  } catch {
    // 展示失败不影响切换结果
  }
}

export async function useCommand(
  type: SdkTypeId,
  specInput: string,
  opts: { vendor?: string },
): Promise<void> {
  const platform: Platform = detectPlatform();
  const spec = getSdkType(type);
  const installed = findInstalled(type, specInput, opts.vendor);
  const label = `${installed.version.vendor}-${spec.formatVersion(installed.version)}`;

  setCurrent(type, installed.home, platform);
  log.ok(`current → ${label}`);

  if (platform.os === 'windows') {
    await setSdkEnvWin(type);
    await ensureUserPathWin(sdkPathEntry(type));
    log.info(`${spec.envVar} and PATH updated in user environment`);
    log.warn('reopen your terminal (or restart your IDE) for the change to take effect');
  } else {
    const rc = detectRcFile(platform.os);
    if (rc) {
      upsertRcFile(rc, type);
      log.info(`updated ${rc} — run: source ${rc} (or open a new terminal)`);
    } else {
      log.warn('could not detect your shell; add this to your rc file manually:');
      console.log(rcBlock(type));
    }
  }
  await showSdkVersion(path.join(installed.home, spec.binRelPath(platform)), type);
}
