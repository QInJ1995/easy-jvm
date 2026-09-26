import crypto from 'node:crypto';
import fs from 'node:fs';
import type { ResolvedArtifact } from '../vendor/types.js';
import { httpText } from './http.js';
import { SdkvmError } from '../util/errors.js';
import { log } from '../ui/log.js';

const HEX64 = /^[0-9a-f]{64}$/i;
const HEX128 = /^[0-9a-f]{128}$/i;

export type ChecksumKind = 'sha256' | 'sha512';

function hexOf(value: unknown, kind: ChecksumKind): string | null {
  const re = kind === 'sha512' ? HEX128 : HEX64;
  return typeof value === 'string' && re.test(value) ? value.toLowerCase() : null;
}

function hex64(value: unknown): string | null {
  return hexOf(value, 'sha256');
}

/**
 * 从校验源文本提取期望值：
 * - "<hash>" / "<hash>  filename"（.sha256 / .sha512）
 * - Adoptium 资产 JSON 的 checksum，或当前 *.tar.gz.json 元数据的 sha256
 * - 旧版元数据 hashes[].content（alg 为 SHA-256）
 */
export function extractExpectedChecksum(text: string, kind: ChecksumKind = 'sha256'): string | null {
  const trimmed = text.trim();
  if (kind === 'sha256' && trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as {
        checksum?: unknown;
        sha256?: unknown;
        hashes?: unknown;
      };
      const direct = hex64(obj.checksum) ?? hex64(obj.sha256);
      if (direct) return direct;
      if (Array.isArray(obj.hashes)) {
        for (const item of obj.hashes) {
          if (!item || typeof item !== 'object') continue;
          const hash = item as { alg?: unknown; content?: unknown };
          const alg = typeof hash.alg === 'string' ? hash.alg.toLowerCase().replace(/-/g, '') : '';
          if (alg === 'sha256') {
            const content = hex64(hash.content);
            if (content) return content;
          }
        }
      }
    } catch {
      // 非法 JSON 视为无校验
    }
    return null;
  }
  const token = trimmed.split(/\s+/)[0] ?? '';
  return hexOf(token, kind);
}

/** 对已落盘的归档再算一遍哈希（Maven 的官方旁路是 sha512，下载流只累计 sha256） */
export function hashFile(file: string, algorithm: ChecksumKind): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    fs.createReadStream(file)
      .on('error', reject)
      .on('data', (chunk) => {
        hash.update(chunk);
      })
      .on('end', () => resolve(hash.digest('hex')));
  });
}

export interface VerifyChecksumOptions {
  /**
   * 严格模式（走镜像下载时开启）：官方与镜像旁路都拿不到校验值时硬失败，
   * 避免无法核对的镜像包被静默放行。哈希不匹配始终硬失败。
   */
  strict?: boolean;
  /**
   * 官方校验 URL 失败或没有有效哈希时再试一次。
   * 通常是镜像上与归档同路径的旁路文件（`.sha512` / `.json`）。
   */
  fallbackUrl?: string;
}

async function readFallbackChecksum(
  artifact: ResolvedArtifact,
  url: string,
  kind: ChecksumKind,
  strict: boolean,
): Promise<string | null> {
  let expected: string | null;
  try {
    expected = extractExpectedChecksum(await httpText(url), kind);
  } catch (err) {
    if (strict) {
      const detail = err instanceof Error ? err.message.split('\n')[0] : String(err);
      throw new SdkvmError(`Cannot fetch checksum for ${artifact.displayName}`, {
        hint: `${detail}. Official and mirror checksum URLs were both unreachable.`,
      });
    }
    log.warn(`cannot fetch mirror checksum for ${artifact.displayName}, skipping verification`);
    return null;
  }
  if (expected) return expected;
  if (strict) {
    throw new SdkvmError(`Checksum source has no valid hash for ${artifact.displayName}`, {
      hint: `Mirror sidecar ${url} did not contain a ${kind} hash.`,
    });
  }
  log.warn(`mirror sidecar has no valid hash for ${artifact.displayName}, skipping verification`);
  return null;
}

/** 尽力校验：来源缺失/获取失败 → warn 放行（strict 且无可用旁路时硬失败）；不匹配 → 硬失败 */
export async function verifyChecksum(
  artifact: ResolvedArtifact,
  actual: string,
  opts: VerifyChecksumOptions = {},
): Promise<void> {
  const strict = opts.strict === true;
  const info = artifact.checksum;
  if (!info) {
    if (strict) {
      throw new SdkvmError(`No checksum source for ${artifact.displayName}`, {
        hint: 'Mirrored downloads require a verifiable checksum; unset the mirror or use the official source.',
      });
    }
    log.warn(`no checksum source for ${artifact.displayName}, skipping verification`);
    return;
  }
  let expected: string | null = info.expected?.toLowerCase() ?? null;
  if (!expected && info.url) {
    const fallback = opts.fallbackUrl && opts.fallbackUrl !== info.url ? opts.fallbackUrl : undefined;
    try {
      expected = extractExpectedChecksum(await httpText(info.url), info.kind);
    } catch (err) {
      if (!fallback) {
        if (strict) {
          const detail = err instanceof Error ? err.message.split('\n')[0] : String(err);
          throw new SdkvmError(`Cannot fetch checksum for ${artifact.displayName}`, {
            hint: `${detail}. Mirrored installs need a reachable checksum URL.`,
          });
        }
        log.warn(`cannot fetch checksum for ${artifact.displayName}, skipping verification`);
        return;
      }
      log.warn(`cannot fetch official checksum for ${artifact.displayName}, trying the mirror sidecar`);
      expected = await readFallbackChecksum(artifact, fallback, info.kind, strict);
      if (!expected) return;
    }
    if (!expected && fallback) {
      log.warn(`official checksum has no valid hash for ${artifact.displayName}, trying the mirror sidecar`);
      expected = await readFallbackChecksum(artifact, fallback, info.kind, strict);
      if (!expected) return;
    }
  }
  if (!expected) {
    if (strict) {
      throw new SdkvmError(`Checksum source has no valid hash for ${artifact.displayName}`, {
        hint: 'Mirrored downloads require a verifiable checksum.',
      });
    }
    log.warn(`checksum source has no valid hash for ${artifact.displayName}, skipping`);
    return;
  }
  if (expected !== actual.toLowerCase()) {
    throw new SdkvmError(`Checksum mismatch for ${artifact.displayName}`, {
      hint: `expected ${expected}, got ${actual}`,
    });
  }
}
