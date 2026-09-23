import type { MajorRelease, ResolvedArtifact, Vendor, VendorPlatform } from './types.js';
import { httpJson } from '../net/http.js';
import { JvmError } from '../util/errors.js';
import { LTS_MAJORS, formatVersion, parseVersion } from '../core/version.js';
import { temurinVendor } from './temurin.js';

const API = 'https://api.azul.com/metadata/v1';

/** os/arch → Azul API 参数 */
function azulParams(platform: VendorPlatform): { os: string; arch: string } {
  return {
    os: platform.os === 'mac' ? 'macos' : platform.os,
    arch: platform.arch === 'aarch64' ? 'arm' : 'x64',
  };
}

interface ZuluPackage {
  name: string;
  download_url: string;
  java_version: number[];
  distro_version: number[];
  sha256_hash?: string;
}

/** 客户端过滤：只要普通 ca-jdk 构建（API 的过滤参数不可靠：会漏进 crac/fx-jre） */
function pickPlainJdk(
  packages: ZuluPackage[],
  platform: VendorPlatform,
  versionPrefix?: string,
): ZuluPackage | null {
  const ext = platform.os === 'windows' ? '.zip' : '.tar.gz';
  const wanted = versionPrefix ?? '';
  const candidates = packages.filter((p) => {
    if (!/^zulu[\d.]+-ca-jdk[\d.]*-/i.test(p.name)) return false;
    if (!p.name.endsWith(ext)) return false;
    if (wanted && !p.java_version.join('.').startsWith(wanted)) return false;
    return true;
  });
  candidates.sort((a, b) => {
    const ja = a.java_version.join('.').localeCompare(b.java_version.join('.'), undefined, {
      numeric: true,
    });
    return ja;
  });
  return candidates[candidates.length - 1] ?? null;
}

async function queryPackages(
  javaVersion: string,
  platform: VendorPlatform,
): Promise<ZuluPackage[]> {
  const { os, arch } = azulParams(platform);
  const url =
    `${API}/zulu/packages/?java_version=${javaVersion}&os=${os}&arch=${arch}` +
    `&hw_bitness=64&release_status=ga&page_size=50`;
  const data = await httpJson<ZuluPackage[]>(url);
  return Array.isArray(data) ? data : [];
}

export const zuluVendor: Vendor = {
  id: 'zulu',
  label: 'Azul Zulu',
  supportsFullVersionList: true,

  async listMajors(): Promise<MajorRelease[]> {
    // 用 Adoptium 的 OpenJDK 发布节奏作为 major 全集，逐个探测 Zulu 是否有构建
    const universe = await temurinVendor.listMajors();
    const results = await Promise.all(
      universe.map(async ({ major }): Promise<MajorRelease | null> => {
        try {
          const packages = await queryPackages(String(major), {
            os: 'mac',
            arch: 'aarch64',
          });
          const pick = pickPlainJdk(packages, { os: 'mac', arch: 'aarch64' });
          if (!pick) return null;
          return { major, lts: LTS_MAJORS.has(major), latestFullVersion: pick.java_version.join('.') };
        } catch {
          return null;
        }
      }),
    );
    return results.filter((r): r is MajorRelease => r !== null);
  },

  async resolve(spec, platform): Promise<ResolvedArtifact> {
    if (spec.kind === 'lts') {
      const majors = await this.listMajors();
      const lts = majors.filter((m) => m.lts);
      if (lts.length === 0) throw new JvmError('No Zulu LTS release found');
      const latest = lts[lts.length - 1];
      if (!latest) throw new JvmError('No Zulu LTS release found');
      return this.resolve({ kind: 'major', major: latest.major }, platform);
    }
    const versionPrefix = spec.kind === 'major' ? String(spec.major) : spec.version;
    const packages = await queryPackages(
      spec.kind === 'major' ? String(spec.major) : String(parseVersion('zulu', spec.version).major),
      platform,
    );
    const pick = pickPlainJdk(packages, platform, versionPrefix);
    if (!pick) {
      throw new JvmError(`No Zulu JDK build matches "${versionPrefix}"`, {
        hint: 'Run `jvm ls -r` to see available versions.',
      });
    }
    const versionStr = pick.java_version.join('.');
    const v = parseVersion('zulu', versionStr);
    return {
      vendorId: 'zulu',
      javaVersion: v,
      dirName: `zulu-${formatVersion(v)}`,
      displayName: `Zulu ${formatVersion(v)}`,
      downloadUrl: pick.download_url,
      checksum: pick.sha256_hash
        ? { kind: 'sha256', expected: pick.sha256_hash }
        : null,
      archive: platform.os === 'windows' ? 'zip' : 'tar.gz',
      layout: platform.os === 'mac' ? 'contents-home' : 'plain',
    };
  },
};
