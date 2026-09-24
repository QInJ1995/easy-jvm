import { afterEach, describe, expect, it, vi } from 'vitest';
import { flutterVendor } from '../src/vendor/flutter.js';

const MAC_ARM = { os: 'mac' as const, arch: 'aarch64' as const };
const MAC_X64 = { os: 'mac' as const, arch: 'x64' as const };
const LIN = { os: 'linux' as const, arch: 'x64' as const };
const LIN_ARM = { os: 'linux' as const, arch: 'aarch64' as const };
const WIN = { os: 'windows' as const, arch: 'x64' as const };

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);
const D = 'd'.repeat(64);
const E = 'e'.repeat(64);

const BASE = 'https://storage.googleapis.com/flutter_infra_release/releases';

/** mac 清单：x64 与 arm64 为两个独立归档；beta 比最新 stable 还新 */
function macManifest() {
  return {
    base_url: BASE,
    current_release: { stable: 'h1', beta: 'h9' },
    releases: [
      rel('h9', 'beta', '3.49.0-0.1.pre', 'arm64', 'beta/macos/flutter_macos_3.49.0-0.1.pre-beta.zip', E),
      rel('h9', 'beta', '3.49.0-0.1.pre', 'x64', 'beta/macos/flutter_macos_3.49.0-0.1.pre-beta.zip', E),
      rel('h1', 'stable', '3.47.5', 'arm64', 'stable/macos/flutter_macos_arm64_3.47.5-stable.zip', A),
      rel('h1', 'stable', '3.47.5', 'x64', 'stable/macos/flutter_macos_3.47.5-stable.zip', B),
      rel('h2', 'stable', '3.47.4', 'arm64', 'stable/macos/flutter_macos_arm64_3.47.4-stable.zip', C),
      rel('h2', 'stable', '3.47.4', 'x64', 'stable/macos/flutter_macos_3.47.4-stable.zip', D),
      rel('h3', 'stable', '3.35.7', 'arm64', 'stable/macos/flutter_macos_arm64_3.35.7-stable.zip', A),
      rel('h3', 'stable', '3.35.7', 'x64', 'stable/macos/flutter_macos_3.35.7-stable.zip', B),
    ],
  };
}

function linuxManifest() {
  return {
    base_url: BASE,
    current_release: { stable: 'h1' },
    releases: [
      rel('h1', 'stable', '3.47.5', 'x64', 'stable/linux/flutter_linux_3.47.5-stable.tar.xz', A),
      rel('h2', 'stable', '3.35.7', 'x64', 'stable/linux/flutter_linux_3.35.7-stable.tar.xz', B),
    ],
  };
}

function rel(
  hash: string,
  channel: 'stable' | 'beta' | 'dev',
  version: string,
  arch: string,
  archive: string,
  sha256: string,
) {
  return {
    hash,
    channel,
    version,
    dart_sdk_version: '3.13.4',
    dart_sdk_arch: arch,
    release_date: '2026-09-18T20:36:35Z',
    archive,
    sha256,
  };
}

function stubApi(json: unknown): void {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(json)));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('flutter vendor', () => {
  it('line resolve picks latest patch of the minor line (stable channel)', async () => {
    stubApi(macManifest());
    const a = await flutterVendor.resolve({ kind: 'line', major: 3, minor: 47 }, MAC_ARM);
    expect(a.dirName).toBe('flutter-3.47.5');
    expect(a.displayName).toBe('Flutter 3.47.5');
    expect(a.downloadUrl).toBe(`${BASE}/stable/macos/flutter_macos_arm64_3.47.5-stable.zip`);
    expect(a.archive).toBe('zip');
    expect(a.checksum?.expected).toBe(A);
  });

  it('mac x64 vs arm64 are distinct archives', async () => {
    stubApi(macManifest());
    const arm = await flutterVendor.resolve({ kind: 'full', version: '3.47.5' }, MAC_ARM);
    const x64 = await flutterVendor.resolve({ kind: 'full', version: '3.47.5' }, MAC_X64);
    expect(arm.downloadUrl).toContain('flutter_macos_arm64_');
    expect(x64.downloadUrl).toContain('flutter_macos_3.47.5');
    expect(x64.downloadUrl).not.toContain('arm64');
    expect(x64.checksum?.expected).toBe(B);
  });

  it('latest follows stable, never a newer beta', async () => {
    stubApi(macManifest());
    const a = await flutterVendor.resolve({ kind: 'latest' }, MAC_ARM);
    expect(a.dirName).toBe('flutter-3.47.5');
  });

  it('full prerelease installs the beta entry', async () => {
    stubApi(macManifest());
    const a = await flutterVendor.resolve({ kind: 'full', version: '3.49.0-0.1.pre' }, MAC_ARM);
    expect(a.dirName).toBe('flutter-3.49.0-0.1.pre');
    expect(a.downloadUrl).toBe(`${BASE}/beta/macos/flutter_macos_3.49.0-0.1.pre-beta.zip`);
  });

  it('full stable exact match, not prefix', async () => {
    stubApi(macManifest());
    const a = await flutterVendor.resolve({ kind: 'full', version: '3.47.4' }, MAC_ARM);
    expect(a.dirName).toBe('flutter-3.47.4');
    expect(a.checksum?.expected).toBe(C);
  });

  it('linux uses tar.xz', async () => {
    stubApi(linuxManifest());
    const a = await flutterVendor.resolve({ kind: 'full', version: '3.47.5' }, LIN);
    expect(a.archive).toBe('tar.xz');
    expect(a.downloadUrl).toBe(`${BASE}/stable/linux/flutter_linux_3.47.5-stable.tar.xz`);
  });

  it('windows resolves x64 zip', async () => {
    stubApi({
      base_url: BASE,
      current_release: { stable: 'h1' },
      releases: [rel('h1', 'stable', '3.47.5', 'x64', 'stable/windows/flutter_windows_3.47.5-stable.zip', D)],
    });
    const a = await flutterVendor.resolve({ kind: 'latest' }, WIN);
    expect(a.archive).toBe('zip');
    expect(a.downloadUrl).toBe(`${BASE}/stable/windows/flutter_windows_3.47.5-stable.zip`);
  });

  it('linux/arm64 → clear error (official releases are x64-only there)', async () => {
    stubApi(linuxManifest());
    await expect(flutterVendor.resolve({ kind: 'latest' }, LIN_ARM)).rejects.toThrow(/x64-only/);
  });

  it('unknown line throws with ls -r hint', async () => {
    stubApi(macManifest());
    await expect(flutterVendor.resolve({ kind: 'line', major: 3, minor: 30 }, MAC_ARM)).rejects.toThrow(
      /No Flutter release matches "3\.30"/,
    );
  });

  it('listMajors groups stable into minor lines, newest first', async () => {
    stubApi(macManifest());
    const lines = await flutterVendor.listMajors();
    expect(lines).toEqual([
      { key: '3.47', lts: false, latestFullVersion: '3.47.5' },
      { key: '3.35', lts: false, latestFullVersion: '3.35.7' },
    ]);
  });
});
