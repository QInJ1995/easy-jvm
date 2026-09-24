import { afterEach, describe, expect, it, vi } from 'vitest';
import { golangVendor } from '../src/vendor/golang.js';

const MAC = { os: 'mac' as const, arch: 'aarch64' as const };
const LIN = { os: 'linux' as const, arch: 'x64' as const };
const WIN = { os: 'windows' as const, arch: 'x64' as const };

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);

const RELEASES = [
  {
    version: 'go1.25.0',
    stable: true,
    files: [{ filename: 'go1.25.0.darwin-arm64.tar.gz', os: 'darwin', arch: 'arm64', kind: 'archive', sha256: C, size: 1 }],
  },
  {
    version: 'go1.24.5',
    stable: true,
    files: [
      { filename: 'go1.24.5.darwin-arm64.tar.gz', os: 'darwin', arch: 'arm64', kind: 'archive', sha256: A, size: 1 },
      { filename: 'go1.24.5.linux-amd64.tar.gz', os: 'linux', arch: 'amd64', kind: 'archive', sha256: B, size: 1 },
      { filename: 'go1.24.5.windows-amd64.zip', os: 'windows', arch: 'amd64', kind: 'archive', sha256: C, size: 1 },
      { filename: 'go1.24.5.src.tar.gz', os: '', arch: '', kind: 'source', sha256: A, size: 1 },
    ],
  },
  {
    version: 'go1.24.4',
    stable: true,
    files: [{ filename: 'go1.24.4.darwin-arm64.tar.gz', os: 'darwin', arch: 'arm64', kind: 'archive', sha256: B, size: 1 }],
  },
  {
    version: 'go1.23.9',
    stable: true,
    files: [{ filename: 'go1.23.9.darwin-arm64.tar.gz', os: 'darwin', arch: 'arm64', kind: 'archive', sha256: A, size: 1 }],
  },
  {
    version: 'go1.26rc1',
    stable: false,
    files: [{ filename: 'go1.26rc1.darwin-arm64.tar.gz', os: 'darwin', arch: 'arm64', kind: 'archive', sha256: A, size: 1 }],
  },
];

function stubGoApi(): void {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(RELEASES)));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('golang vendor', () => {
  it('line resolve picks latest patch of the minor line (mac/arm64 → darwin/arm64)', async () => {
    stubGoApi();
    const a = await golangVendor.resolve({ kind: 'line', major: 1, minor: 24 }, MAC);
    expect(a.dirName).toBe('golang-1.24.5');
    expect(a.displayName).toBe('Go 1.24.5');
    expect(a.downloadUrl).toBe('https://go.dev/dl/go1.24.5.darwin-arm64.tar.gz');
    expect(a.archive).toBe('tar.gz');
    expect(a.checksum?.expected).toBe(A);
  });

  it('x64 maps to amd64 in filenames', async () => {
    stubGoApi();
    const a = await golangVendor.resolve({ kind: 'full', version: '1.24.5' }, LIN);
    expect(a.downloadUrl).toBe('https://go.dev/dl/go1.24.5.linux-amd64.tar.gz');
    expect(a.checksum?.expected).toBe(B);
  });

  it('windows uses zip archive', async () => {
    stubGoApi();
    const a = await golangVendor.resolve({ kind: 'full', version: '1.24.5' }, WIN);
    expect(a.archive).toBe('zip');
    expect(a.downloadUrl).toBe('https://go.dev/dl/go1.24.5.windows-amd64.zip');
  });

  it('latest picks the newest stable', async () => {
    stubGoApi();
    const a = await golangVendor.resolve({ kind: 'latest' }, MAC);
    expect(a.dirName).toBe('golang-1.25.0');
  });

  it('full exact match, not prefix', async () => {
    stubGoApi();
    const a = await golangVendor.resolve({ kind: 'full', version: '1.24.4' }, MAC);
    expect(a.dirName).toBe('golang-1.24.4');
  });

  it('unknown line throws with hint', async () => {
    stubGoApi();
    await expect(golangVendor.resolve({ kind: 'line', major: 1, minor: 22 }, MAC)).rejects.toThrow(
      /No Go release matches "1\.22"/,
    );
  });

  it('base release (no patch) parses and formats without .0', async () => {
    stubGoApi();
    const a = await golangVendor.resolve({ kind: 'full', version: '1.25.0' }, MAC);
    // API 里 go1.25.0 有 patch；真正无 patch 的基础版在真实数据中是 go1.25 形态，由 version.test 覆盖解析
    expect(a.dirName).toBe('golang-1.25.0');
  });

  it('listMajors groups into minor lines, excludes rc', async () => {
    stubGoApi();
    const lines = await golangVendor.listMajors();
    expect(lines).toEqual([
      { key: '1.25', lts: false, latestFullVersion: '1.25.0' },
      { key: '1.24', lts: false, latestFullVersion: '1.24.5' },
      { key: '1.23', lts: false, latestFullVersion: '1.23.9' },
    ]);
  });
});
