import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { detectPlatform, type Platform } from '../core/platform.js';
import { findInstalled } from '../core/registry.js';
import { setCurrent } from '../fs/link.js';
import { javaBin } from '../fs/layout.js';
import { detectRcFile } from '../shell/detect.js';
import { rcBlock, upsertRcFile } from '../shell/rc.js';
import { ensureUserPathWin, setJavaHomeWin } from '../shell/winenv.js';
import { log } from '../ui/log.js';
import type { VendorId } from '../vendor/types.js';

const execFileAsync = promisify(execFile);

async function showJavaVersion(javaBinPath: string): Promise<void> {
  try {
    const { stderr } = await execFileAsync(javaBinPath, ['-version'], { timeout: 30_000 });
    const line = (stderr || '').split('\n').find((l) => l.includes('version'));
    if (line) log.info(line.trim());
  } catch {
    // 展示失败不影响切换结果
  }
}

export async function useCommand(
  specInput: string,
  opts: { vendor?: string },
): Promise<void> {
  const platform: Platform = detectPlatform();
  const installed = findInstalled(specInput, opts.vendor as VendorId | undefined);
  const label = `${installed.version.vendor}-${installed.version.raw}`;

  setCurrent(installed.javaHome, platform);
  log.ok(`current → ${label}`);

  if (platform.os === 'windows') {
    await setJavaHomeWin();
    await ensureUserPathWin();
    log.info('JAVA_HOME and PATH updated in user environment');
    log.warn('reopen your terminal (or restart your IDE) for the change to take effect');
  } else {
    const rc = detectRcFile(platform.os);
    if (rc) {
      upsertRcFile(rc);
      log.info(`updated ${rc} — run: source ${rc} (or open a new terminal)`);
    } else {
      log.warn('could not detect your shell; add this to your rc file manually:');
      console.log(rcBlock());
    }
  }
  await showJavaVersion(javaBin(installed.javaHome, platform));
}
