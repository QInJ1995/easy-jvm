#!/usr/bin/env node
import { Command } from 'commander';
import { toSdkvmError } from './util/errors.js';
import { log } from './ui/log.js';
import { installCommand } from './cli/install.js';
import { useCommand } from './cli/use.js';
import { lsCommand, currentCommand } from './cli/ls.js';
import { uninstallCommand } from './cli/uninstall.js';
import { mirrorCommand } from './cli/mirror.js';
import { getVersion, versionCommand } from './cli/misc.js';
import { upgradeCommand } from './cli/upgrade.js';
import { getSdkType } from './sdk/index.js';
import type { SdkTypeId } from './sdk/types.js';

const program = new Command();

program
  .name('sdkvm')
  .description('SDK version manager — install & switch JDKs (Temurin / Zulu / Corretto), Go toolchains, Flutter SDKs, and Node.js runtimes')
  .version(getVersion());

/** 某类型的一组命令（install/use/ls/uninstall/mirror）挂到给定 commander 节点上 */
function registerSdkCommands(cmd: Command, type: SdkTypeId): void {
  const s = getSdkType(type);
  const isJava = type === 'java';
  const installHelp = isJava
    ? '21 | lts | 21.0.5 | 21.0.5+11 | temurin-21'
    : type === 'go'
      ? '1.24 | 1.24.5 | latest | golang-1.24'
      : type === 'flutter'
        ? '3.47 | 3.47.5 | 3.49.0-0.1.pre | latest | flutter-3.47'
        : '22 | 22.20.0 | lts | latest | nodejs-22.20.0';
  const vendorIds = s.vendors.map((v) => v.id).join(' | ');

  cmd
    .command('install')
    .description(`install a ${s.label}: ${installHelp}`)
    .argument('<version>', 'version spec (optional vendor- prefix)')
    .option('--vendor <id>', `vendor: ${vendorIds}`)
    .option('--force', 'reinstall even if already installed')
    .action((v: string, o: { vendor?: string; force?: boolean }) => installCommand(type, v, o));

  cmd
    .command('use')
    .description(`switch the current ${s.label} (updates ${s.envVar} / PATH)`)
    .argument('<version>', `installed version, e.g. ${isJava ? '21 / temurin-21.0.5+11' : type === 'go' ? '1.24 / golang-1.24.5' : type === 'flutter' ? '3.47 / flutter-3.47.5' : '22 / nodejs-22.20.0'}`)
    .option('--vendor <id>', 'restrict matching to a vendor')
    .action((v: string, o: { vendor?: string }) => useCommand(type, v, o));

  cmd
    .command('ls')
    .alias('list')
    .description(`list installed ${s.label}s (→ marks current); -r lists installable versions`)
    .option('-r, --remote', 'list installable versions from all vendors')
    .option('--vendor <id>', 'filter --remote output to one vendor')
    .action((o: { remote?: boolean; vendor?: string }) => lsCommand(type, o));

  cmd
    .command('current')
    .description(`show the current ${s.label}`)
    .action(() => currentCommand([type]));

  cmd
    .command('uninstall')
    .description(`remove an installed ${s.label}`)
    .argument('<version>', `installed version, e.g. ${isJava ? '21 / temurin-21.0.5+11' : type === 'go' ? '1.24 / golang-1.24.5' : type === 'flutter' ? '3.47 / flutter-3.47.5' : '22 / nodejs-22.20.0'}`)
    .option('--vendor <id>', 'restrict matching to a vendor')
    .action((v: string, o: { vendor?: string }) => uninstallCommand(type, v, o));

  cmd
    .command('mirror')
    .description('show or set the download mirror')
    .argument('[action]', 'show | set | unset')
    .argument('[vendor]', 'vendor id')
    .argument('[url]', 'mirror root URL')
    .action((a: string | undefined, v: string | undefined, u: string | undefined) =>
      mirrorCommand(type, a, v, u),
    );
}

// 裸命令 = java（历史行为，向后兼容）
registerSdkCommands(program, 'java');

// java / go / flutter / node 子命令组
const javaCmd = program.command('java').description('Java (JDK) subcommands (same as the bare commands)');
registerSdkCommands(javaCmd, 'java');
javaCmd.action(() => javaCmd.help());

const goCmd = program.command('go').description('Go toolchain subcommands');
registerSdkCommands(goCmd, 'go');
goCmd.action(() => goCmd.help());

const flutterCmd = program.command('flutter').description('Flutter SDK subcommands');
registerSdkCommands(flutterCmd, 'flutter');
flutterCmd.action(() => flutterCmd.help());

const nodeCmd = program.command('node').description('Node.js subcommands');
registerSdkCommands(nodeCmd, 'node');
nodeCmd.action(() => nodeCmd.help());

// 裸 current 显示全部类型
program.commands.find((c) => c.name() === 'current')?.action(() => currentCommand());

program
  .command('version')
  .description('print sdkvm CLI version')
  .action(versionCommand);

program
  .command('upgrade')
  .description('upgrade the sdkvm CLI (script install replaces ~/.sdkvm/cli; npm install prints npm update -g)')
  .action(upgradeCommand);

program.parseAsync(process.argv).catch((err: unknown) => {
  const e = toSdkvmError(err);
  log.error(e.message);
  if (e.hint) log.info(e.hint);
  process.exitCode = e.exitCode;
});
