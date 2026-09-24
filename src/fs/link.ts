import fs from 'node:fs';
import path from 'node:path';
import { paths } from '../core/paths.js';
import type { Platform } from '../core/platform.js';
import type { SdkTypeId } from '../sdk/types.js';

/** 切换某类型的 current 指向（target 必须是绝对路径）。Unix 原子 rename；Windows junction 重建。 */
export function setCurrent(type: SdkTypeId, target: string, platform: Platform): void {
  const link = paths.current(type);
  if (platform.os === 'windows') {
    // junction 要求绝对路径；无法 rename 覆盖，只能重建（窗口期极短）
    try {
      fs.rmSync(link, { force: true });
    } catch {
      fs.rmSync(link, { recursive: true, force: true });
    }
    fs.symlinkSync(target, link, 'junction');
    return;
  }
  const tmp = `${link}.tmp-${process.pid}`;
  fs.rmSync(tmp, { force: true });
  fs.symlinkSync(target, tmp);
  fs.renameSync(tmp, link);
}

/** current 不存在或损坏返回 null */
export function readCurrent(type: SdkTypeId): string | null {
  const link = paths.current(type);
  try {
    const st = fs.lstatSync(link);
    if (!st.isSymbolicLink()) return null;
    const raw = fs.readlinkSync(link) as string;
    return path.resolve(path.dirname(link), raw);
  } catch {
    return null;
  }
}

export function clearCurrent(type: SdkTypeId): void {
  const link = paths.current(type);
  try {
    fs.rmSync(link, { force: true });
  } catch {
    fs.rmSync(link, { recursive: true, force: true });
  }
}
