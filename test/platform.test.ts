import { describe, expect, it } from 'vitest';
import { detectPlatform } from '../src/core/platform.js';
import { JvmError } from '../src/util/errors.js';

describe('detectPlatform', () => {
  it('darwin arm64', () => {
    expect(detectPlatform({ platform: 'darwin', arch: 'arm64' })).toMatchObject({ os: 'mac', arch: 'aarch64' });
  });
  it('darwin x64', () => {
    expect(detectPlatform({ platform: 'darwin', arch: 'x64' })).toMatchObject({ os: 'mac', arch: 'x64' });
  });
  it('linux x64 / aarch64', () => {
    expect(detectPlatform({ platform: 'linux', arch: 'x64' }).os).toBe('linux');
    expect(detectPlatform({ platform: 'linux', arch: 'aarch64' }).os).toBe('linux');
  });
  it('win32 x64', () => {
    expect(detectPlatform({ platform: 'win32', arch: 'x64' })).toMatchObject({ os: 'windows', arch: 'x64' });
  });
  it('unsupported os/arch throw', () => {
    expect(() => detectPlatform({ platform: 'freebsd', arch: 'x64' })).toThrow(JvmError);
    expect(() => detectPlatform({ platform: 'linux', arch: 'arm' })).toThrow(JvmError);
  });
});
