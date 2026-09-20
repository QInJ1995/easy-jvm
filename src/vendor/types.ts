import type { JdkVersion } from '../core/version.js';

export type VendorId = 'temurin' | 'zulu' | 'corretto';

/** vendor 层需要的平台信息（core/platform.ts 的 Platform 结构兼容） */
export interface VendorPlatform {
  os: 'mac' | 'linux' | 'windows';
  arch: 'aarch64' | 'x64';
}

export type VersionSpec =
  | { kind: 'major'; major: number }
  | { kind: 'lts' }
  | { kind: 'full'; version: string };

export interface ResolvedArtifact {
  vendorId: VendorId;
  javaVersion: JdkVersion;
  /** 落盘目录名，如 "temurin-21.0.5+11" */
  dirName: string;
  /** 展示名，如 "Temurin 21.0.5+11" */
  displayName: string;
  downloadUrl: string;
  /** sha256 校验信息；尽力校验，缺失时 warn 放行 */
  checksum: { kind: 'sha256'; url?: string; expected?: string } | null;
  archive: 'tar.gz' | 'zip';
  /** 期望布局，最终以 layout.ts 实际探测为准 */
  layout: 'contents-home' | 'plain';
}

export interface MajorRelease {
  major: number;
  lts: boolean;
  /** 该 major 最新完整版本（corretto 等无列表 API 的 vendor 可缺省） */
  latestFullVersion?: string;
}

export interface Vendor {
  readonly id: VendorId;
  readonly label: string;
  /** false = 无版本列表 API，仅支持按 major 安装最新（corretto） */
  readonly supportsFullVersionList: boolean;
  listMajors(): Promise<MajorRelease[]>;
  resolve(spec: VersionSpec, platform: VendorPlatform): Promise<ResolvedArtifact>;
}
