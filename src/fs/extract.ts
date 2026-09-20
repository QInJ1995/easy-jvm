import fs from 'node:fs';
import path from 'node:path';
import { run } from '../util/spawn.js';
import type { Platform } from '../core/platform.js';

const WIN_TAR = 'C:\\Windows\\System32\\tar.exe';

/** 解压 tar.gz / zip 到全新空目录（降低路径穿越面） */
export async function extractArchive(
  archiveFile: string,
  archiveType: 'tar.gz' | 'zip',
  destDir: string,
  platform: Platform,
): Promise<void> {
  fs.mkdirSync(destDir, { recursive: true });

  if (platform.os === 'windows') {
    // Win10 1803+ 自带 bsdtar（支持 zip），失败回退 Expand-Archive
    if (fs.existsSync(WIN_TAR)) {
      await run(WIN_TAR, ['-xf', archiveFile, '-C', destDir]);
    } else {
      await run('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -LiteralPath '${archiveFile.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
      ]);
    }
    return;
  }

  if (archiveType === 'zip' && platform.rawPlatform === 'linux') {
    // Linux GNU tar 不支持 zip（正常情况下 Linux 无 zip 归档，防御性回退）
    await run('unzip', ['-q', '-o', archiveFile, '-d', destDir]);
    return;
  }
  // macOS bsdtar / Linux GNU tar 均可 -xf 自动识别压缩格式
  await run('tar', ['-xf', archiveFile, '-C', destDir]);
}

export function tmpExtractDir(base: string): string {
  return path.join(base, `extract-${Date.now()}-${process.pid}`);
}
