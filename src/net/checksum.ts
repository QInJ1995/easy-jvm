import type { ResolvedArtifact } from '../vendor/types.js';
import { httpText } from './http.js';
import { SdkvmError } from '../util/errors.js';
import { log } from '../ui/log.js';

const HEX64 = /^[0-9a-f]{64}$/i;

function hex64(value: unknown): string | null {
  return typeof value === 'string' && HEX64.test(value) ? value.toLowerCase() : null;
}

/**
 * 从校验源文本提取期望值：
 * - "<hash>" / "<hash>  filename"（.sha256.txt）
 * - Adoptium 资产 JSON 的 checksum，或当前 *.tar.gz.json 元数据的 sha256
 * - 旧版元数据 hashes[].content（alg 为 SHA-256）
 */
export function extractExpectedChecksum(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
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
  return HEX64.test(token) ? token.toLowerCase() : null;
}

export interface VerifyChecksumOptions {
  /**
   * 严格模式（走镜像下载时开启）：校验源缺失或拉取失败则硬失败，
   * 避免镜像包在无法核对官方 checksum 时被静默放行。
   */
  strict?: boolean;
}

/** 尽力校验：来源缺失/获取失败 → warn 放行（strict 时硬失败）；不匹配 → 硬失败 */
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
    try {
      expected = extractExpectedChecksum(await httpText(info.url));
    } catch (err) {
      if (strict) {
        const detail = err instanceof Error ? err.message.split('\n')[0] : String(err);
        throw new SdkvmError(`Cannot fetch checksum for ${artifact.displayName}`, {
          hint: `${detail}. Mirrored installs need the official checksum URL to be reachable.`,
        });
      }
      log.warn(`cannot fetch checksum for ${artifact.displayName}, skipping verification`);
      return;
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
