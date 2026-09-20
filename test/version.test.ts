import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  formatVersion,
  parseDirName,
  parseUserSpec,
  parseVersion,
} from '../src/core/version.js';
import { JvmError } from '../src/util/errors.js';

describe('parseVersion', () => {
  it('parses temurin with build', () => {
    const v = parseVersion('temurin', '21.0.5+11');
    expect([v.major, v.minor, v.patch]).toEqual([21, 0, 5]);
    expect(v.extra).toBeNull();
    expect(v.build).toBe('11');
  });

  it('parses temurin 4-segment with build', () => {
    const v = parseVersion('temurin', '21.0.12.1+1');
    expect(v.extra).toBe('1');
    expect(v.build).toBe('1');
    expect(formatVersion(v)).toBe('21.0.12.1+1');
  });

  it('parses corretto 5-segment', () => {
    const v = parseVersion('corretto', '21.0.12.9.1');
    expect(v.extra).toBe('9.1');
    expect(v.build).toBeNull();
    expect(formatVersion(v)).toBe('21.0.12.9.1');
  });

  it('parses zulu 4-segment', () => {
    const v = parseVersion('zulu', '21.0.12.1');
    expect(v.extra).toBe('1');
    expect(formatVersion(v)).toBe('21.0.12.1');
  });

  it('strips jdk- prefix', () => {
    expect(parseVersion('temurin', 'jdk-21.0.5+11').build).toBe('11');
  });

  it('major only formats back to major', () => {
    expect(formatVersion(parseVersion('temurin', '21'))).toBe('21');
  });

  it('rejects garbage', () => {
    expect(() => parseVersion('temurin', 'abc')).toThrow(JvmError);
    expect(() => parseVersion('temurin', '21.x.5')).toThrow(JvmError);
  });
});

describe('compareVersions', () => {
  const t = (s: string) => parseVersion('temurin', s);
  it('builds compare numerically', () => {
    expect(compareVersions(t('21.0.5+9'), t('21.0.5+11'))).toBeLessThan(0);
  });
  it('numeric not lexicographic segments', () => {
    expect(compareVersions(t('21.0.4.9.1'), t('21.0.4.10.1'))).toBeLessThan(0);
  });
  it('missing extra is smaller', () => {
    expect(compareVersions(t('21.0.12'), t('21.0.12.1'))).toBeLessThan(0);
  });
  it('major dominates', () => {
    expect(compareVersions(t('21.9.9'), t('22.0.0'))).toBeLessThan(0);
  });
});

describe('parseDirName', () => {
  it('roundtrip', () => {
    const v = parseDirName('temurin-21.0.5+11');
    expect(v?.vendor).toBe('temurin');
    expect(v?.build).toBe('11');
  });
  it('rejects unknown', () => {
    expect(parseDirName('foo')).toBeNull();
    expect(parseDirName('graal-21')).toBeNull();
  });
});

describe('parseUserSpec', () => {
  it('major / lts / full', () => {
    expect(parseUserSpec('21').spec).toEqual({ kind: 'major', major: 21 });
    expect(parseUserSpec('lts').spec).toEqual({ kind: 'lts' });
    expect(parseUserSpec('21.0.5+11').spec).toEqual({ kind: 'full', version: '21.0.5+11' });
  });
  it('vendor prefix', () => {
    const r = parseUserSpec('zulu-21');
    expect(r.vendor).toBe('zulu');
    expect(r.spec).toEqual({ kind: 'major', major: 21 });
  });
  it('invalid throws', () => {
    expect(() => parseUserSpec('hello')).toThrow(JvmError);
  });
});
