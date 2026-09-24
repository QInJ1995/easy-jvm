import type { ResolvedArtifact } from '../vendor/types.js';
import { httpText } from './http.js';
import { SdkvmError } from '../util/errors.js';
import { log } from '../ui/log.js';

const HEX64 = /^[0-9a-f]{64}$/i;

/** 从校验源文本提取期望值："<hash>" / "<hash>  filename" / Adoptium 资产 JSON 的 checksum 字段 */
export function extractExpectedChecksum(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as { checksum?: string };
      if (obj.checksum && HEX64.test(obj.checksum)) return obj.checksum.toLowerCase();
    } catch {
      // 非法 JSON 视为无校验
    }
    return null;
  }
  const token = trimmed.split(/\s+/)[0] ?? '';
  return HEX64.test(token) ? token.toLowerCase() : null;
}

/** 尽力校验：来源缺失/获取失败 → warn 放行；不匹配 → 硬失败 */
export async function verifyChecksum(
  artifact: ResolvedArtifact,
  actual: string,
): Promise<void> {
  const info = artifact.checksum;
  if (!info) {
    log.warn(`no checksum source for ${artifact.displayName}, skipping verification`);
    return;
  }
  let expected: string | null = info.expected?.toLowerCase() ?? null;
  if (!expected && info.url) {
    try {
      expected = extractExpectedChecksum(await httpText(info.url));
    } catch {
      log.warn(`cannot fetch checksum for ${artifact.displayName}, skipping verification`);
      return;
    }
  }
  if (!expected) {
    log.warn(`checksum source has no valid hash for ${artifact.displayName}, skipping`);
    return;
  }
  if (expected !== actual.toLowerCase()) {
    throw new SdkvmError(`Checksum mismatch for ${artifact.displayName}`, {
      hint: `expected ${expected}, got ${actual}`,
    });
  }
}
