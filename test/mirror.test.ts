import { describe, expect, it } from 'vitest';
import { applyMirror } from '../src/vendor/mirror.js';
import { parseVersion } from '../src/core/version.js';
import type { ResolvedArtifact, VendorId } from '../src/vendor/types.js';

function artifact(url: string, vendorId: VendorId = 'temurin'): ResolvedArtifact {
  return {
    vendorId,
    javaVersion: parseVersion(vendorId, '21.0.12.1+1'),
    dirName: `${vendorId}-21`,
    displayName: 'Test',
    downloadUrl: url,
    checksum: null,
    archive: 'tar.gz',
    layout: 'contents-home',
  };
}

const GH =
  'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.12.1_1.tar.gz';

describe('applyMirror', () => {
  const mac = { os: 'mac' as const, arch: 'aarch64' as const };

  it('rewrites temurin github URL to mirror structure', () => {
    const out = applyMirror(artifact(GH), mac, 'https://mirrors.nju.edu.cn/adoptium');
    expect(out.downloadUrl).toBe(
      'https://mirrors.nju.edu.cn/adoptium/21/jdk/aarch64/mac/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.12.1_1.tar.gz',
    );
  });

  it('normalizes trailing slashes', () => {
    const out = applyMirror(artifact(GH), mac, 'https://mirrors.nju.edu.cn/adoptium/');
    expect(out.downloadUrl).toContain('https://mirrors.nju.edu.cn/adoptium/21/');
  });

  it('no mirror → untouched', () => {
    expect(applyMirror(artifact(GH), mac, null).downloadUrl).toBe(GH);
  });

  it('non-temurin untouched', () => {
    const a = artifact('https://cdn.azul.com/zulu/bin/zulu21.tar.gz', 'zulu');
    expect(applyMirror(a, mac, 'https://mirrors.nju.edu.cn/adoptium').downloadUrl).toBe(
      'https://cdn.azul.com/zulu/bin/zulu21.tar.gz',
    );
  });

  it('non-github temurin URL untouched', () => {
    const a = artifact('https://example.com/other.tar.gz');
    expect(applyMirror(a, mac, 'https://m.example').downloadUrl).toBe('https://example.com/other.tar.gz');
  });
});
