import type { Platform } from '../core/platform.js';
import type { ReleaseLine, SdkVersion, UserSpec, Vendor, VendorPlatform, VersionSpec } from '../vendor/types.js';

/** SDK 类型 id：java / go（未来可扩展） */
export type SdkTypeId = 'java' | 'go';

/**
 * SDK 类型描述：目录布局、版本语法、环境变量、探测方式全部按类型参数化，
 * cli/core 各层经它泛化，新增 SDK 类型不再复制命令实现。
 */
export interface SdkTypeSpec {
  readonly id: SdkTypeId;
  /** 展示名，如 "Java (JDK)" */
  readonly label: string;
  /** 安装根目录名（根目录之下），java 沿用历史名 jdks */
  readonly installDirName: string;
  /** current 链接名（根目录之下） */
  readonly currentLinkName: string;
  /** 切换时导出的环境变量名：JAVA_HOME / GOROOT */
  readonly envVar: string;
  /** 是否支持 lts 语义（java 有 LTS，go 没有） */
  readonly supportsLts: boolean;
  /** 有序厂商列表，[0] 为默认厂商 */
  readonly vendors: readonly Vendor[];
  parseUserSpec(input: string): UserSpec;
  /** 安装目录名 → 版本；不匹配返回 null */
  parseDirName(dir: string): SdkVersion | null;
  formatVersion(v: SdkVersion): string;
  compareVersions(a: SdkVersion, b: SdkVersion): number;
  /** home 目录内可执行文件的相对路径 */
  binRelPath(platform: Platform | VendorPlatform): string;
  /** 解压根目录 → 环境语义目录（java macOS bundle → Contents/Home；go 原样） */
  locateHome(root: string): string;
  /** use 后打印版本的方式（java -version 在 stderr；go version 在 stdout） */
  readonly versionCheck: { args: string[]; stream: 'stdout' | 'stderr' };
}

export type { ReleaseLine, SdkVersion, UserSpec, VersionSpec, Vendor };
