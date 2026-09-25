import fs from 'node:fs';
import path from 'node:path';
import { paths, sdkvmHome } from '../core/paths.js';
import { detectPlatform } from '../core/platform.js';
import { downloadFile } from '../net/download.js';
import { httpText } from '../net/http.js';
import { extractArchive } from '../fs/extract.js';
import { SdkvmError } from '../util/errors.js';
import { log } from '../ui/log.js';
import { getVersion } from './misc.js';

export const RELEASE_REPO = 'QInJ1995/sdkvm';
export const RELEASE_ASSET = 'sdkvm.tgz';
export const RELEASE_SUMS = 'SHA256SUMS';

/** 脚本安装把 CLI 放在 ~/.sdkvm/cli；没有该目录则视为 npm 全局安装。 */
export function isScriptInstall(home = sdkvmHome()): boolean {
  return fs.existsSync(path.join(home, 'cli', 'package.json'));
}

export function releaseBase(): string {
  const fromEnv = process.env.SDKVM_RELEASE_BASE?.replace(/\/+$/, '');
  return fromEnv || `https://github.com/${RELEASE_REPO}/releases`;
}

export function releaseAssetUrl(name: string, base = releaseBase()): string {
  return `${base}/latest/download/${name}`;
}

/** 从 `sha256sum` 输出里取出某个文件名的摘要。 */
export function checksumFor(sumsText: string, fileName: string): string | null {
  for (const line of sumsText.split('\n')) {
    const match = /^([0-9a-f]{64})\s+\*?(\S+)\s*$/i.exec(line.trim());
    const hash = match?.[1];
    const name = match?.[2];
    if (hash && name === fileName) return hash.toLowerCase();
  }
  return null;
}

/** 用已校验的 npm pack 归档替换 CLI 目录，不动 runtime 与已装 SDK。 */
export async function replaceCliPackage(archiveFile: string, home = sdkvmHome()): Promise<void> {
  const staging = path.join(home, 'cli.next');
  const bak = path.join(home, 'cli.bak');
  const cli = path.join(home, 'cli');
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(home, { recursive: true });
  await extractArchive(archiveFile, 'tar.gz', staging, detectPlatform());
  const unpacked = path.join(staging, 'package');
  if (!fs.existsSync(path.join(unpacked, 'package.json'))) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw new SdkvmError('Release archive is missing package/package.json', { hint: archiveFile });
  }
  fs.rmSync(bak, { recursive: true, force: true });
  if (fs.existsSync(cli)) fs.renameSync(cli, bak);
  fs.renameSync(unpacked, cli);
  fs.rmSync(bak, { recursive: true, force: true });
  fs.rmSync(staging, { recursive: true, force: true });
}

export async function upgradeCommand(): Promise<void> {
  if (!isScriptInstall()) {
    log.info('this install came from npm; upgrade with: npm update -g sdkvm');
    return;
  }
  const sumsUrl = releaseAssetUrl(RELEASE_SUMS);
  const assetUrl = releaseAssetUrl(RELEASE_ASSET);
  log.info(`checking ${assetUrl}`);
  const expected = checksumFor(await httpText(sumsUrl), RELEASE_ASSET);
  if (!expected) {
    throw new SdkvmError(`No checksum for ${RELEASE_ASSET}`, { hint: sumsUrl });
  }
  fs.mkdirSync(paths.tmp(), { recursive: true });
  const dest = path.join(paths.tmp(), RELEASE_ASSET);
  const downloaded = await downloadFile(assetUrl, dest);
  if (downloaded.sha256 !== expected) {
    fs.rmSync(dest, { force: true });
    throw new SdkvmError(`Checksum mismatch for ${RELEASE_ASSET}`, {
      hint: `expected ${expected}, got ${downloaded.sha256}`,
    });
  }
  const before = getVersion();
  await replaceCliPackage(dest);
  fs.rmSync(dest, { force: true });
  log.ok(`upgraded CLI package in ${path.join(sdkvmHome(), 'cli')} (was ${before}); runtime and installed SDKs were left in place`);
}
