import { currentJdk, listInstalled } from '../core/registry.js';
import { formatVersion } from '../core/version.js';
import { log } from '../ui/log.js';

export function lsCommand(): void {
  const installed = listInstalled();
  if (installed.length === 0) {
    log.info('no JDK installed');
    log.info('try: jvm install lts');
    return;
  }
  const current = currentJdk();
  for (const j of installed) {
    const name = `${j.version.vendor}-${formatVersion(j.version)}`;
    const marker = current?.dirPath === j.dirPath ? '→' : ' ';
    log.raw(`${marker} ${name}`);
  }
}
