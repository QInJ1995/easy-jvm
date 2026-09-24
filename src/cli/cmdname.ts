import type { SdkTypeId } from '../sdk/types.js';

/**
 * bin 命令名与提示串前缀。改名发布时只翻转这一个常量，
 * 全部 "run: jvm use 21" 类提示自动跟随。
 */
export const CLI_BIN = 'jvm';

/** 提示串里的命令前缀：java 类型沿用裸命令（jvm install 21），其余为子命令组（jvm go install 1.24） */
export function cmdPath(type: SdkTypeId): string {
  return type === 'java' ? CLI_BIN : `${CLI_BIN} ${type}`;
}
