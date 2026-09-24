import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { envOverride } from './env.js';

/** SDKVM_HOME（旧名 JVM_HOME 仍识别）可覆盖根目录（测试与自定义安装位置用） */
export function jvmHome(): string {
  return envOverride('SDKVM_HOME', 'JVM_HOME') ?? path.join(os.homedir(), '.jvm');
}

export const paths = {
  root: jvmHome,
  jdks: () => path.join(jvmHome(), 'jdks'),
  current: () => path.join(jvmHome(), 'current'),
  cache: () => path.join(jvmHome(), 'cache'),
  tmp: () => path.join(jvmHome(), 'tmp'),
  config: () => path.join(jvmHome(), 'config.json'),
  lock: () => path.join(jvmHome(), '.lock'),
};

export function ensureLayout(): void {
  for (const dir of [jvmHome(), paths.jdks(), paths.cache(), paths.tmp()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
