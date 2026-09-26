import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractExpectedChecksum, verifyChecksum } from '../src/net/checksum.js';
import { SdkvmError } from '../src/util/errors.js';
import { log } from '../src/ui/log.js';
import type { ResolvedArtifact } from '../src/vendor/types.js';
import { parseVersion } from '../src/core/version.js';

function art(partial: Partial<ResolvedArtifact> = {}): ResolvedArtifact {
  return {
    vendorId: 'temurin',
    version: parseVersion('temurin', '21.0.1+1'),
    dirName: 'temurin-21.0.1+1',
    displayName: 'Temurin 21.0.1+1',
    downloadUrl: 'https://example.com/a.tar.gz',
    checksum: null,
    archive: 'tar.gz',
    ...partial,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('extractExpectedChecksum', () => {
  const hash = 'ab'.repeat(32);

  it('reads a bare hash or a sha256.txt line', () => {
    expect(extractExpectedChecksum(`${hash}\n`)).toBe(hash);
    expect(extractExpectedChecksum(`${hash.toUpperCase()}  file.tar.gz`)).toBe(hash);
  });

  it('reads Adoptium metadata sha256 and the older checksum field', () => {
    expect(extractExpectedChecksum(JSON.stringify({ sha256: hash, vendor: 'Eclipse Adoptium' }))).toBe(
      hash,
    );
    expect(extractExpectedChecksum(JSON.stringify({ checksum: hash }))).toBe(hash);
  });

  it('reads a SHA-256 entry from the legacy hashes array', () => {
    expect(
      extractExpectedChecksum(
        JSON.stringify({
          hashes: [
            { alg: 'SHA-1', content: 'aa'.repeat(20) },
            { alg: 'SHA-256', content: hash },
          ],
        }),
      ),
    ).toBe(hash);
  });

  it('returns null when the JSON has no hash', () => {
    expect(extractExpectedChecksum(JSON.stringify({ vendor: 'Eclipse Adoptium' }))).toBeNull();
    expect(extractExpectedChecksum('{')).toBeNull();
  });
});

describe('verifyChecksum', () => {
  it('warns and skips when no checksum in non-strict mode', async () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    await verifyChecksum(art(), 'a'.repeat(64));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no checksum source'));
  });

  it('strict mode fails when checksum source is missing', async () => {
    await expect(verifyChecksum(art(), 'a'.repeat(64), { strict: true })).rejects.toBeInstanceOf(
      SdkvmError,
    );
  });

  it('strict mode fails when checksum URL cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    await expect(
      verifyChecksum(
        art({ checksum: { kind: 'sha256', url: 'https://example.com/a.tar.gz.json' } }),
        'a'.repeat(64),
        { strict: true },
      ),
    ).rejects.toThrow(/Cannot fetch checksum/);
  });

  it('strict mode accepts Adoptium metadata sha256', async () => {
    const hash = 'ab'.repeat(32);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ sha256: hash }))),
    );
    await verifyChecksum(
      art({ checksum: { kind: 'sha256', url: 'https://example.com/a.tar.gz.json' } }),
      hash,
      { strict: true },
    );
  });

  it('accepts inline expected hash', async () => {
    await verifyChecksum(
      art({ checksum: { kind: 'sha256', expected: 'ab'.repeat(32) } }),
      'AB'.repeat(32),
    );
  });

  it('mismatch always fails', async () => {
    await expect(
      verifyChecksum(art({ checksum: { kind: 'sha256', expected: 'ab'.repeat(32) } }), 'cd'.repeat(32)),
    ).rejects.toThrow(/Checksum mismatch/);
  });
});
