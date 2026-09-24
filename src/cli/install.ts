import fs from 'node:fs';
import path from 'node:path';
import { detectPlatform } from '../core/platform.js';
import { loadConfig } from '../core/config.js';
import { withLock } from '../core/lock.js';
import { ensureLayout, paths } from '../core/paths.js';
import { envOverride } from '../core/env.js';
import { parseUserSpec } from '../core/version.js';
import { getSdkType } from '../sdk/index.js';
import type { SdkTypeId } from '../sdk/types.js';
import { getVendor, resolveVendorId } from '../vendor/index.js';
import { applyMirror } from '../vendor/mirror.js';
import { downloadFile, cacheFileName } from '../net/download.js';
import { verifyChecksum } from '../net/checksum.js';
import { extractArchive, tmpExtractDir } from '../fs/extract.js';
import { normalizeExtracted } from '../fs/layout.js';
import { log } from '../ui/log.js';
import { createProgress } from '../ui/progress.js';
import { SdkvmError } from '../util/errors.js';
import { cmdPath } from './cmdname.js';

/** Windows 上杀软可能短暂锁住新解压的文件导致 rename 失败，重试兜底 */
async function renameWithRetry(from: string, to: string, attempts = 3): Promise<void> {
  for (let i = 1; ; i++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (err) {
      if (i >= attempts) throw err;
      log.warn(`rename blocked (attempt ${i}/${attempts}), retrying in 1s ...`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export async function installCommand(
  type: SdkTypeId,
  specInput: string,
  opts: { vendor?: string; force?: boolean },
): Promise<void> {
  const platform = detectPlatform();
  const config = loadConfig();
  const { vendor: specVendor, spec } = getSdkType(type).parseUserSpec(specInput);
  const vendorId = resolveVendorId(type, specVendor ?? opts.vendor, config);
  const vendor = getVendor(type, vendorId);

  log.info(`resolving ${vendor.label} ${specInput} for ${platform.os}/${platform.arch} ...`);
  const resolved = await vendor.resolve(spec, platform);
  const mirrorRoot = envOverride('SDKVM_MIRROR', 'JVM_MIRROR') ?? config.mirror[vendorId] ?? null;
  const artifact = applyMirror(resolved, platform, mirrorRoot);

  const finalDir = path.join(paths.sdks(type), artifact.dirName);
  // java 提示用 major，go 提示用 minor 线（1.24）
  const hintVersion =
    type === 'java'
      ? String(artifact.version.major)
      : `${artifact.version.major}.${artifact.version.minor}`;
  if (fs.existsSync(finalDir)) {
    if (!opts.force) {
      log.warn(`${artifact.displayName} is already installed`);
      log.info(`run: ${cmdPath(type)} use ${hintVersion}`);
      return;
    }
    log.warn(`--force: removing existing ${artifact.dirName}`);
  }

  await withLock(async () => {
    ensureLayout();
    // 清理残留 .part
    for (const f of fs.readdirSync(paths.cache())) {
      if (f.endsWith('.part')) fs.rmSync(path.join(paths.cache(), f), { force: true });
    }

    const dest = path.join(paths.cache(), cacheFileName(artifact.downloadUrl));
    const progress = createProgress(`↓ ${artifact.displayName}`);
    log.info(`downloading ${artifact.downloadUrl}`);
    const dl = await downloadFile(artifact.downloadUrl, dest, (b, t) => progress.update(b, t));
    progress.done(dl.bytes, null);

    await verifyChecksum(artifact, dl.sha256);

    const tmp = tmpExtractDir(paths.tmp());
    let finalTmp = tmp;
    try {
      log.info('extracting ...');
      await extractArchive(dest, artifact.archive, tmp, platform);
      const normalized = normalizeExtracted(tmp, platform, type);
      finalTmp = normalized.root;
      if (fs.existsSync(finalDir)) fs.rmSync(finalDir, { recursive: true, force: true });
      fs.renameSync(normalized.root, finalDir);
    } catch (err) {
      fs.rmSync(finalTmp, { recursive: true, force: true });
      fs.rmSync(tmp, { recursive: true, force: true });
      throw err instanceof SdkvmError ? err : err;
    } finally {
      fs.rmSync(dest, { force: true });
      fs.rmSync(paths.tmp(), { recursive: true, force: true });
      fs.mkdirSync(paths.tmp(), { recursive: true });
    }
  });

  log.ok(`installed ${artifact.displayName} → ${finalDir}`);
  log.info(`switch to it: ${cmdPath(type)} use ${hintVersion}`);
}
