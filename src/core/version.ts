import { SdkvmError } from '../util/errors.js';

/** 厂商 id：全局唯一字符串（temurin/zulu/corretto/golang），config.mirror 以它为键 */
export type VendorId = string;

/** 与 Adoptium available_lts_releases 对齐的 LTS major 集（仅 java） */
export const LTS_MAJORS = new Set([8, 11, 17, 21, 25]);

export const JAVA_VENDOR_IDS = ['temurin', 'zulu', 'corretto'] as const;

/** 统一版本模型：java（extra/build 段）与 go（patch 可空）共用 */
export interface SdkVersion {
  vendor: VendorId;
  major: number;
  minor: number;
  /** go 基础版（go1.24）无 patch 段 */
  patch: number | null;
  /** major.minor.patch 之后的额外段（temurin "21.0.12.1+1" 的 "1"、corretto "21.0.12.9.1" 的 "9.1"） */
  extra: string | null;
  /** "+" 之后的 build 号（temurin/zulu "11"） */
  build: string | null;
  raw: string;
}

/** 解析 java 版本串。容忍 vendor 前缀（"jdk-21.0.5+11" / "temurin-21"）。 */
export function parseVersion(vendor: VendorId, input: string): SdkVersion {
  const raw = input.trim();
  const vendorPrefix = new RegExp(`^(${JAVA_VENDOR_IDS.join('|')})-`, 'i');
  let s = raw.replace(/^jdk-/i, '').replace(vendorPrefix, '').replace(/^v/i, '');
  s = s.replace(/^zulu\d[\d.]*-ca-jdk[\d.]*-?/i, ''); // zulu 文件名里混入的发行版号

  const plusIdx = s.indexOf('+');
  const basePart = plusIdx >= 0 ? s.slice(0, plusIdx) : s;
  const build = plusIdx >= 0 ? s.slice(plusIdx + 1) : null;

  const segs = basePart.split('.').filter((x) => x.length > 0);
  if (segs.length === 0) {
    throw new SdkvmError(`Invalid JDK version: "${input}"`);
  }
  const nums = segs.map((x) => Number(x));
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new SdkvmError(`Invalid JDK version: "${input}"`, {
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

export function formatVersion(v: SdkVersion): string {
  if (v.patch !== null && v.minor === 0 && v.patch === 0 && !v.extra && !v.build) return String(v.major);
  let s = `${v.major}.${v.minor}.${v.patch ?? 0}`;
  if (v.extra) s += `.${v.extra}`;
  if (v.build) s += `+${v.build}`;
  return s;
}

export function toDirName(v: SdkVersion): string {
  return `${v.vendor}-${formatVersion(v)}`;
}

/** java 安装目录名 → 版本；不匹配返回 null */
export function parseDirName(dir: string): SdkVersion | null {
  const m = new RegExp(`^(${JAVA_VENDOR_IDS.join('|')})-(.+)$`).exec(dir);
  if (!m || !m[1] || !m[2]) return null;
  try {
    return parseVersion(m[1], m[2]);
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

/** 同 vendor 内比较；major → minor → patch（null 视为 0）→ extra → build 数值分段 */
export function compareVersions(a: SdkVersion, b: SdkVersion): number {
  for (const key of ['major', 'minor'] as const) {
    if (a[key] !== b[key]) return a[key] - b[key] > 0 ? 1 : -1;
  }
  const pa = a.patch ?? 0;
  const pb = b.patch ?? 0;
  if (pa !== pb) return pa - pb > 0 ? 1 : -1;
  const extra = numericPairwise(a.extra, b.extra);
  if (extra !== 0) return extra;
  return numericPairwise(a.build, b.build);
}

/**
 * 版本查询：major（java 装该大版本最新）/ line（go 装该 minor 线最新）/
 * lts（仅 java）/ latest（仅 go）/ full（精确）
 */
export type VersionSpec =
  | { kind: 'major'; major: number }
  | { kind: 'line'; major: number; minor: number }
  | { kind: 'lts' }
  | { kind: 'latest' }
  | { kind: 'full'; version: string };

/** 用户输入解析结果：可带 vendor 前缀（"zulu-21"） */
export interface UserSpec {
  vendor?: VendorId;
  spec: VersionSpec;
}

/** java 版本语法：21 / lts / 21.0.5 / 21.0.5+11，可带 vendor 前缀 */
export function parseUserSpec(input: string): UserSpec {
  let s = input.trim().toLowerCase();
  let vendor: VendorId | undefined;
  const m = new RegExp(`^(${JAVA_VENDOR_IDS.join('|')})-(.+)$`).exec(s);
  if (m && m[1] && m[2]) {
    vendor = m[1];
    s = m[2];
  }
  if (s === 'lts' || s === '--lts') return { vendor, spec: { kind: 'lts' } };
  if (/^\d+$/.test(s)) return { vendor, spec: { kind: 'major', major: Number(s) } };
  if (/^\d+(\.\d+)*(\+[0-9.]+)?$/.test(s)) return { vendor, spec: { kind: 'full', version: s } };
  throw new SdkvmError(`Invalid version: "${input}"`, {
    hint: 'Expected: 21, lts, 21.0.5, 21.0.5+11, or with vendor prefix like temurin-21',
  });
}
