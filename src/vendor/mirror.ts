import type { ResolvedArtifact, VendorPlatform } from './types.js';

/**
 * mirror 仅替换 tarball 下载 URL（metadata 始终走官方 API）。
 * Temurin 官方 GitHub URL → 镜像结构 {root}/{major}/jdk/{arch}/{os}/{file}
 * 已验证镜像：https://mirrors.nju.edu.cn/adoptium
 */
export function applyMirror(
  artifact: ResolvedArtifact,
  platform: VendorPlatform,
  mirrorRoot: string | null | undefined,
): ResolvedArtifact {
  if (!mirrorRoot || artifact.vendorId !== 'temurin') return artifact;
  const m =
    /^https:\/\/github\.com\/adoptium\/temurin(\d+)-binaries\/releases\/download\/[^/]+\/(.+)$/.exec(
      artifact.downloadUrl,
    );
  if (!m || !m[1] || !m[2]) return artifact;
  const root = mirrorRoot.replace(/\/+$/, '');
  const url = `${root}/${m[1]}/jdk/${platform.arch}/${platform.os}/${m[2]}`;
  return { ...artifact, downloadUrl: url };
}
