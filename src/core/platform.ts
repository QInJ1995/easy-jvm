import { SdkvmError } from '../util/errors.js';

/** 三家 vendor 通用的平台描述 */
export interface Platform {
  os: 'mac' | 'linux' | 'windows';
  arch: 'aarch64' | 'x64';
  /** Node 原始值，供特殊分支使用 */
  rawPlatform: NodeJS.Platform;
  rawArch: string;
}

export function detectPlatform(override?: { platform?: string; arch?: string }): Platform {
  const rawPlatform = (override?.platform ?? process.platform) as NodeJS.Platform;
  const rawArch = override?.arch ?? process.arch;

  const osMap: Record<string, Platform['os']> = {
    darwin: 'mac',
    linux: 'linux',
    win32: 'windows',
  };
  const archMap: Record<string, Platform['arch']> = {
    arm64: 'aarch64',
    aarch64: 'aarch64',
    x64: 'x64',
  };

  const os = osMap[rawPlatform];
  const arch = archMap[rawArch];
  if (!os) {
    throw new SdkvmError(`Unsupported operating system: ${rawPlatform}`, {
      hint: 'sdkvm currently supports macOS, Linux and Windows.',
    });
  }
  if (!arch) {
    throw new SdkvmError(`Unsupported CPU architecture: ${rawArch}`, {
      hint: 'sdkvm currently supports aarch64 (Apple Silicon / ARM) and x64.',
    });
  }
  return { os, arch, rawPlatform, rawArch };
}

export function isWindows(platform: Platform): boolean {
  return platform.os === 'windows';
}
