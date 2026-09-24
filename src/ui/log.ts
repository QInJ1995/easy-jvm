import pc from 'picocolors';
import { envOverride } from '../core/env.js';

const isQuiet = () => Boolean(envOverride('SDKVM_QUIET', 'JVM_QUIET'));

const label = {
  info: pc.cyan('sdkvm'),
  ok: pc.green('sdkvm'),
  warn: pc.yellow('sdkvm'),
  error: pc.red('sdkvm'),
};

export const log = {
  info(msg: string): void {
    if (!isQuiet()) console.log(`${label.info} ${msg}`);
  },
  ok(msg: string): void {
    if (!isQuiet()) console.log(`${label.ok} ${msg}`);
  },
  warn(msg: string): void {
    if (!isQuiet()) console.error(`${label.warn} ${pc.yellow(msg)}`);
  },
  error(msg: string): void {
    console.error(`${label.error} ${pc.red(msg)}`);
  },
  /** 无前缀输出（列表、表格数据） */
  raw(msg: string): void {
    console.log(msg);
  },
};
