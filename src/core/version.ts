import type { VendorId } from '../vendor/types.js';
import { JvmError } from '../util/errors.js';

/** 与 Adoptium available_lts_releases 对齐的 LTS major 集 */
export const LTS_MAJORS = new Set([8, 11, 17, 21, 25]);

export const VENDOR_IDS = ['temurin', 'zulu', 'corretto'] as const;

export interface JdkVersion {
  vendor: VendorId;
  major: number;
  minor: number;
  patch: number;
  /** major.minor.patch 之后的额外段（temurin "21.0.12.1+1" 的 "1"、corretto "21.0.12.9.1" 的 "9.1"） */
  extra: string | null;
  /** "+" 之后的 build 号（temurin/zulu "11"） */
  build: string | null;
  raw: string;
}

/** 解析版本串。容忍 vendor 前缀（"jdk-21.0.5+11" / "temurin-21"）。 */
export function parseVersion(vendor: VendorId, input: string): JdkVersion {
  const raw = input.trim();
  let s = raw.replace(/^jdk-/i, '').replace(/^(temurin|zulu|corretto)-/i, '').replace(/^v/i, '');
  s = s.replace(/^zulu\d[\d.]*-ca-jdk[\d.]*-?/i, ''); // zulu 文件名里混入的发行版号

  const plusIdx = s.indexOf('+');
  const basePart = plusIdx >= 0 ? s.slice(0, plusIdx) : s;
  const build = plusIdx >= 0 ? s.slice(plusIdx + 1) : null;

  const segs = basePart.split('.').filter((x) => x.length > 0);
  if (segs.length === 0) {
    throw new JvmError(`Invalid JDK version: "${input}"`);
  }
  const nums = segs.map((x) => Number(x));
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new JvmError(`Invalid JDK version: "${input}"`, {
      hint: 'Expected forms: 21, 21.0.5, 21.0.5+11',
    });
  }
  return {
    vendor,
    major: nums[0] as number,
    minor: nums[1] ?? 0,
    patch: nums[2] ?? 0,
    extra: segs.length > 3 ? segs.slice(3).join('.') : null,
    build,
    raw,
  };
}

export function formatVersion(v: JdkVersion): string {
  if (v.minor === 0 && v.patch === 0 && !v.extra && !v.build) return String(v.major);
  let s = `${v.major}.${v.minor}.${v.patch}`;
  if (v.extra) s += `.${v.extra}`;
  if (v.build) s += `+${v.build}`;
  return s;
}

export function toDirName(v: JdkVersion): string {
  return `${v.vendor}-${formatVersion(v)}`;
}

/** 目录名 → 版本；不匹配返回 null */
export function parseDirName(dir: string): JdkVersion | null {
  const m = /^(temurin|zulu|corretto)-(.+)$/.exec(dir);
  if (!m || !m[1] || !m[2]) return null;
  try {
    return parseVersion(m[1] as VendorId, m[2]);
  } catch {
    return null;
  }
}

function numericPairwise(a: string | null, b: string | null): number {
  const as = a ? a.split('.') : [];
  const bs = b ? b.split('.') : [];
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const x = as[i];
    const y = bs[i];
    if (x === undefined && y !== undefined) return -1;
    if (x !== undefined && y === undefined) return 1;
    const xn = Number(x);
    const yn = Number(y);
    if (Number.isInteger(xn) && Number.isInteger(yn)) {
      if (xn !== yn) return xn - yn > 0 ? 1 : -1;
    } else {
      const c = String(x).localeCompare(String(y));
      if (c !== 0) return c > 0 ? 1 : -1;
    }
  }
  return 0;
}

/** 同 vendor 内比较；major → minor → patch → extra → build 数值分段 */
export function compareVersions(a: JdkVersion, b: JdkVersion): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (a[key] !== b[key]) return a[key] - b[key] > 0 ? 1 : -1;
  }
  const extra = numericPairwise(a.extra, b.extra);
  if (extra !== 0) return extra;
  return numericPairwise(a.build, b.build);
}

/** 版本查询：major（装最新）/ lts / full（精确） */
export type VersionSpec =
  | { kind: 'major'; major: number }
  | { kind: 'lts' }
  | { kind: 'full'; version: string };

/** 用户输入解析结果：可带 vendor 前缀（"zulu-21"） */
export interface UserSpec {
  vendor?: VendorId;
  spec: VersionSpec;
}

export function parseUserSpec(input: string): UserSpec {
  let s = input.trim().toLowerCase();
  let vendor: VendorId | undefined;
  const m = /^(temurin|zulu|corretto)-(.+)$/.exec(s);
  if (m && m[1] && m[2]) {
    vendor = m[1] as VendorId;
    s = m[2];
  }
  if (s === 'lts' || s === '--lts') return { vendor, spec: { kind: 'lts' } };
  if (/^\d+$/.test(s)) return { vendor, spec: { kind: 'major', major: Number(s) } };
  if (/^\d+(\.\d+)*(\+[0-9.]+)?$/.test(s)) return { vendor, spec: { kind: 'full', version: s } };
  throw new JvmError(`Invalid version: "${input}"`, {
    hint: 'Expected: 21, lts, 21.0.5, 21.0.5+11, or with vendor prefix like temurin-21',
  });
}
