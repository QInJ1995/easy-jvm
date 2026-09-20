import fs from 'node:fs';
import { findInstalled, currentJdk } from '../core/registry.js';
import { withLock } from '../core/lock.js';
import { clearCurrent } from '../fs/link.js';
import { log } from '../ui/log.js';
import type { VendorId } from '../vendor/types.js';

export async function uninstallCommand(
  specInput: string,
  opts: { vendor?: string },
): Promise<void> {
  const installed = findInstalled(specInput, opts.vendor as VendorId | undefined);
  await withLock(async () => {
    if (currentJdk()?.dirPath === installed.dirPath) {
      clearCurrent();
      log.warn('uninstalled the current JDK; JAVA_HOME is now dangling');
      log.info('select another: jvm use <version>');
    }
    fs.rmSync(installed.dirPath, { recursive: true, force: true });
  });
  log.ok(`removed ${installed.version.vendor}-${installed.version.raw}`);
}
