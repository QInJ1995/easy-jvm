import fs from 'node:fs';
import { findInstalled, currentSdk } from '../core/registry.js';
import { withLock } from '../core/lock.js';
import { clearCurrent } from '../fs/link.js';
import { getSdkType } from '../sdk/index.js';
import type { SdkTypeId } from '../sdk/types.js';
import { log } from '../ui/log.js';
import { cmdPath } from './cmdname.js';

export async function uninstallCommand(
  type: SdkTypeId,
  specInput: string,
  opts: { vendor?: string },
): Promise<void> {
  const spec = getSdkType(type);
  const installed = findInstalled(type, specInput, opts.vendor);
  await withLock(async () => {
    if (currentSdk(type)?.dirPath === installed.dirPath) {
      clearCurrent(type);
      log.warn(`uninstalled the current ${spec.label}; ${spec.envVar} is now dangling`);
      log.info(`select another: ${cmdPath(type)} use <version>`);
    }
    fs.rmSync(installed.dirPath, { recursive: true, force: true });
  });
  log.ok(`removed ${installed.version.vendor}-${spec.formatVersion(installed.version)}`);
}
