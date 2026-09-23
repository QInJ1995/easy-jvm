#!/usr/bin/env node
import { Command } from 'commander';
import { toJvmError } from './util/errors.js';
import { log } from './ui/log.js';
import { installCommand } from './cli/install.js';
import { useCommand } from './cli/use.js';
import { lsCommand } from './cli/ls.js';
import { currentCommand } from './cli/current.js';
import { uninstallCommand } from './cli/uninstall.js';
import { mirrorCommand } from './cli/mirror.js';
import { getVersion, versionCommand } from './cli/misc.js';

const program = new Command();

program
  .name('jvm')
  .description('JDK version manager — install & switch Temurin / Zulu / Corretto JDKs')
  .version(getVersion());

program
  .command('install')
  .description('install a JDK: 21 | lts | 21.0.5 | 21.0.5+11 | temurin-21')
  .argument('<version>', 'major, "lts", or full version (optional vendor- prefix)')
  .option('--vendor <id>', 'vendor: temurin (default) | zulu | corretto')
  .option('--force', 'reinstall even if already installed')
  .action(installCommand);

program
  .command('use')
  .description('switch the current JDK (updates JAVA_HOME / PATH)')
  .argument('<version>', 'installed version, e.g. 21 / temurin-21.0.5+11')
  .option('--vendor <id>', 'restrict matching to a vendor')
  .action(useCommand);

program
  .command('ls')
  .alias('list')
  .description('list installed JDKs (→ marks current); -r lists installable versions')
  .option('-r, --remote', 'list installable versions from all vendors')
  .option('--vendor <id>', 'filter --remote output to one vendor')
  .action(lsCommand);

program
  .command('current')
  .description('show the current JDK')
  .action(currentCommand);

program
  .command('uninstall')
  .description('remove an installed JDK')
  .argument('<version>', 'installed version, e.g. 21 / temurin-21.0.5+11')
  .option('--vendor <id>', 'restrict matching to a vendor')
  .action(uninstallCommand);

program
  .command('mirror')
  .description('show or set the download mirror (temurin only)')
  .argument('[action]', 'show | set | unset')
  .argument('[vendor]', 'vendor id (default temurin)')
  .argument('[url]', 'mirror root URL, e.g. https://mirrors.nju.edu.cn/adoptium')
  .action(mirrorCommand);

program
  .command('version')
  .description('print jvm CLI version')
  .action(versionCommand);

program.parseAsync(process.argv).catch((err: unknown) => {
  const e = toJvmError(err);
  log.error(e.message);
  if (e.hint) log.info(e.hint);
  process.exitCode = e.exitCode;
});
