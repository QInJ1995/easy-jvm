import type { ResolvedArtifact, VendorPlatform } from './types.js';

/**
 * mirror 仅替换 tarball 下载 URL（metadata 始终走官方 API）。按 vendor 分派策略：
 * - temurin：官方 GitHub URL → 镜像结构 {root}/{major}/jdk/{arch}/{os}/{file}（已验证镜像：https://mirrors.nju.edu.cn/adoptium）
 * - golang：文件名直接拼接 {root}/{filename}（兼容 https://golang.google.cn/dl 与 https://mirrors.aliyun.com/golang）
 * - flutter：官方桶前缀替换 storage.googleapis.com/flutter_infra_release → {root}（已验证镜像：https://mirror.nju.edu.cn/flutter/flutter_infra_release）
 */
export function applyMirror(
  artifact: ResolvedArtifact,
  platform: VendorPlatform,
  mirrorRoot: string | null | undefined,
): ResolvedArtifact {
  if (!mirrorRoot) return artifact;
  if (artifact.vendorId === 'golang') {
    const root = mirrorRoot.replace(/\/+$/, '');
    const file = artifact.downloadUrl.split('/').pop();
    if (!file) return artifact;
    return { ...artifact, downloadUrl: `${root}/${file}` };
  }
  if (artifact.vendorId === 'flutter') {
    const root = mirrorRoot.replace(/\/+$/, '');
    const url = artifact.downloadUrl.replace(
      /^https:\/\/storage\.googleapis\.com\/flutter_infra_release/,
      root,
    );
    return { ...artifact, downloadUrl: url };
  }
  if (artifact.vendorId !== 'temurin') return artifact;
  const m =
    /^https:\/\/github\.com\/adoptium\/temurin(\d+)-binaries\/releases\/download\/[^/]+\/(.+)$/.exec(
      artifact.downloadUrl,
    );
  if (!m || !m[1] || !m[2]) return artifact;
  const root = mirrorRoot.replace(/\/+$/, '');
  const url = `${root}/${m[1]}/jdk/${platform.arch}/${platform.os}/${m[2]}`;
  return { ...artifact, downloadUrl: url };
}
