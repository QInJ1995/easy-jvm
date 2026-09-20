import fs from 'node:fs';
import path from 'node:path';
import type { Platform } from '../core/platform.js';
import { JvmError } from '../util/errors.js';

export interface NormalizedJdk {
  /** 解压出的 JDK 根目录（含 release 文件那一层；macOS 为 bundle 根） */
  root: string;
  /** JAVA_HOME 语义目录（macOS bundle 下为 root/Contents/Home） */
  javaHome: string;
}

/** 定位 java 可执行文件（Windows 为 java.exe） */
export function javaBin(javaHome: string, platform: Platform): string {
  return path.join(javaHome, 'bin', platform.os === 'windows' ? 'java.exe' : 'java');
}

/**
 * 归一化解压结果：单根目录探测 + macOS Contents/Home 定位 + bin/java 校验。
 * root 候选：解压目录里唯一子目录（常见 tarball 布局）或解压目录本身（散装文件）。
 */
export function normalizeExtracted(tmpDir: string, platform: Platform): NormalizedJdk {
  const entries = fs.readdirSync(tmpDir).filter((e) => e !== '._' && !e.startsWith('._'));
  // 忽略 macOS 元数据文件后判断唯一目录
  const real = entries.filter((e) => e !== '.DS_Store');
  let root: string;
  if (real.length === 1 && fs.statSync(path.join(tmpDir, real[0] as string)).isDirectory()) {
    root = path.join(tmpDir, real[0] as string);
  } else {
    root = tmpDir;
  }

  let javaHome = root;
  if (platform.os === 'mac') {
    const contentsHome = path.join(root, 'Contents', 'Home');
    if (fs.existsSync(path.join(contentsHome, 'bin'))) javaHome = contentsHome;
  }

  if (!fs.existsSync(javaBin(javaHome, platform))) {
    throw new JvmError('Archive does not look like a valid JDK (bin/java not found)', {
      hint: `expected ${javaBin(javaHome, platform)}`,
    });
  }
  return { root, javaHome };
}
