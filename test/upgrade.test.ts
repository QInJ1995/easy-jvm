import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checksumFor, isScriptInstall, replaceCliPackage } from '../src/cli/upgrade.js';

let home: string;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'sdkvm-upgrade-'));
  process.env.SDKVM_HOME = home;
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
  delete process.env.SDKVM_HOME;
});

describe('upgrade install method', () => {
  it('npm install has no cli package', () => {
    expect(isScriptInstall(home)).toBe(false);
  });

  it('script install is the cli directory', () => {
    fs.mkdirSync(path.join(home, 'cli'), { recursive: true });
    fs.writeFileSync(path.join(home, 'cli', 'package.json'), '{"version":"1.0.0"}\n');
    expect(isScriptInstall(home)).toBe(true);
  });
});

describe('checksumFor', () => {
  it('reads the hash for a named asset', () => {
    const text = [
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  sdkvm-1.0.0.tgz',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb *sdkvm.tgz',
    ].join('\n');
    expect(checksumFor(text, 'sdkvm.tgz')).toBe('b'.repeat(64));
    expect(checksumFor(text, 'missing.tgz')).toBeNull();
  });
});

describe('replaceCliPackage', () => {
  it('replaces cli and leaves runtime in place', () => {
    const runtime = path.join(home, 'runtime', 'current');
    fs.mkdirSync(runtime, { recursive: true });
    fs.writeFileSync(path.join(runtime, 'marker'), 'keep');
    fs.mkdirSync(path.join(home, 'cli'), { recursive: true });
    fs.writeFileSync(path.join(home, 'cli', 'package.json'), '{"version":"0.0.1"}\n');

    const stage = path.join(home, 'stage', 'package');
    fs.mkdirSync(path.join(stage, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(stage, 'package.json'), '{"version":"1.2.3"}\n');
    fs.writeFileSync(path.join(stage, 'dist', 'index.js'), 'console.log(1)\n');
    const archive = path.join(home, 'sdkvm.tgz');
    execFileSync('tar', ['-czf', archive, '-C', path.join(home, 'stage'), 'package']);

    return replaceCliPackage(archive, home).then(() => {
      expect(fs.readFileSync(path.join(home, 'cli', 'package.json'), 'utf8')).toContain('1.2.3');
      expect(fs.readFileSync(path.join(runtime, 'marker'), 'utf8')).toBe('keep');
      expect(fs.existsSync(path.join(home, 'cli.next'))).toBe(false);
      expect(fs.existsSync(path.join(home, 'cli.bak'))).toBe(false);
    });
  });
});
