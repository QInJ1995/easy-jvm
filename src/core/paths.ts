import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { envOverride } from './env.js';
import { SDK_TYPES, getSdkType } from '../sdk/index.js';
import type { SdkTypeId } from '../sdk/types.js';

/** SDKVM_HOME（旧名 JVM_HOME 仍识别）可覆盖根目录（测试与自定义安装位置用） */
export function sdkvmHome(): string {
  return envOverride('SDKVM_HOME', 'JVM_HOME') ?? path.join(os.homedir(), '.sdkvm');
}

export const paths = {
  root: sdkvmHome,
  /** 各 SDK 类型的安装根（~/.sdkvm/jdks 等） */
  sdks: (type: SdkTypeId) => path.join(sdkvmHome(), getSdkType(type).installDirName),
  /** 各 SDK 类型的 current 链接（~/.sdkvm/current-java 等） */
  current: (type: SdkTypeId) => path.join(sdkvmHome(), getSdkType(type).currentLinkName),
  cache: () => path.join(sdkvmHome(), 'cache'),
  tmp: () => path.join(sdkvmHome(), 'tmp'),
  config: () => path.join(sdkvmHome(), 'config.json'),
  lock: () => path.join(sdkvmHome(), '.lock'),
};

export function ensureLayout(): void {
  const dirs = [sdkvmHome(), ...SDK_TYPES.map((t) => paths.sdks(t)), paths.cache(), paths.tmp()];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
