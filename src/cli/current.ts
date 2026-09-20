import { currentJdk } from '../core/registry.js';
import { formatVersion } from '../core/version.js';
import { log } from '../ui/log.js';

export function currentCommand(): void {
  const current = currentJdk();
  if (!current) {
    log.info('no current JDK');
    log.info('run: jvm use <version>   (see: jvm ls)');
    return;
  }
  log.raw(`${current.version.vendor}-${formatVersion(current.version)}`);
  log.raw(`JAVA_HOME → ${current.javaHome}`);
}
