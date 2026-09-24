import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateLegacyHomeIfNeeded } from '../src/core/migrate.js';
import { rcBegin } from '../src/shell/rc.js';
import { LEGACY_RC_BEGIN } from '../src/shell/rc.js';

const MAC: { os: 'mac'; arch: 'aarch64'; rawPlatform: 'darwin'; rawArch: 'arm64' } = {
  os: 'mac',
  arch: 'aarch64',
  rawPlatform: 'darwin',
  rawArch: 'arm64',
};

let work: string;
let oldHome: string;
let newHome: string;
let rcFile: string;

function mkJdk(dirName: string): string {
  const dir = path.join(oldHome, 'jdks', dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'release'), 'JAVA_VERSION="21.0.5"');
  return dir;
}

beforeEach(() => {
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'sdkvm-migrate-'));
  oldHome = path.join(work, 'old-home');
  newHome = path.join(work, 'new-home');
  rcFile = path.join(work, '.bashrc');
  fs.mkdirSync(oldHome, { recursive: true });
  delete process.env.SDKVM_HOME;
  delete process.env.JVM_HOME;
});

afterEach(() => {
  fs.rmSync(work, { recursive: true, force: true });
  delete process.env.SDKVM_HOME;
  delete process.env.JVM_HOME;
});

describe('migrateLegacyHomeIfNeeded', () => {
  it('renames root, preserves config/jdks, rewrites current link to current-java', async () => {
    const jdk = mkJdk('temurin-21.0.5+11');
    fs.writeFileSync(path.join(oldHome, 'config.json'), JSON.stringify({ version: 1, defaultVendor: 'temurin', mirror: {} }, null, 2));
    fs.symlinkSync(jdk, path.join(oldHome, 'current'));

    const result = await migrateLegacyHomeIfNeeded({ oldHome, newHome, rcFile, platform: MAC });
    expect(result).toBe('migrated');
    expect(fs.existsSync(oldHome)).toBe(false);
    expect(fs.existsSync(path.join(newHome, 'jdks', 'temurin-21.0.5+11'))).toBe(true);
    expect(fs.readFileSync(path.join(newHome, 'config.json'), 'utf8')).toContain('"defaultVendor": "temurin"');
    // 旧 current 消失，新 current-java 指向重写后的绝对路径
    expect(fs.existsSync(path.join(newHome, 'current'))).toBe(false);
    const link = path.join(newHome, 'current-java');
    expect(fs.existsSync(link)).toBe(true);
    expect(fs.readlinkSync(link)).toBe(path.join(newHome, 'jdks', 'temurin-21.0.5+11'));
  });

  it('replaces legacy rc block in place', async () => {
    mkJdk('temurin-21.0.5+11');
    fs.symlinkSync(path.join(oldHome, 'jdks', 'temurin-21.0.5+11'), path.join(oldHome, 'current'));
    fs.writeFileSync(rcFile, 'export A=1\n\n# >>> jvm init >>>\nexport JAVA_HOME="$HOME/.jvm/current"\n# <<< jvm init <<<\n');

    await migrateLegacyHomeIfNeeded({ oldHome, newHome, rcFile, platform: MAC });
    const out = fs.readFileSync(rcFile, 'utf8');
    expect(out).not.toContain(LEGACY_RC_BEGIN);
    expect(out).toContain(rcBegin('java'));
    expect(out).toContain('export A=1');
    // newHome 在 home 之外（测试注入），rc 块按设计回退为绝对路径；
    // 真实迁移（~/.sdkvm）时写入的是 $HOME/.sdkvm/current-java
    // rc 块内分隔符恒为 /（Windows 上 path.join 给 \）
    expect(out).toContain(`JAVA_HOME="${path.join(newHome, 'current-java').split(path.sep).join('/')}"`);
  });

  it('rc without legacy block is untouched', async () => {
    fs.writeFileSync(rcFile, 'export A=1\n');
    await migrateLegacyHomeIfNeeded({ oldHome, newHome, rcFile, platform: MAC });
    expect(fs.readFileSync(rcFile, 'utf8')).toBe('export A=1\n');
  });

  it('no old home → not-needed', async () => {
    fs.rmSync(oldHome, { recursive: true });
    expect(await migrateLegacyHomeIfNeeded({ oldHome, newHome, rcFile, platform: MAC })).toBe('not-needed');
  });

  it('both homes exist → conflict, nothing touched', async () => {
    mkJdk('temurin-21.0.5+11');
    fs.mkdirSync(newHome, { recursive: true });
    const result = await migrateLegacyHomeIfNeeded({ oldHome, newHome, rcFile, platform: MAC });
    expect(result).toBe('conflict');
    expect(fs.existsSync(oldHome)).toBe(true);
  });

  it('env override set → not-needed (no rename)', async () => {
    process.env.SDKVM_HOME = path.join(work, 'custom');
    expect(await migrateLegacyHomeIfNeeded({ rcFile, platform: MAC })).toBe('not-needed');
    expect(fs.existsSync(oldHome)).toBe(true);
  });

  it('second run is a no-op (idempotent)', async () => {
    mkJdk('temurin-21.0.5+11');
    await migrateLegacyHomeIfNeeded({ oldHome, newHome, rcFile, platform: MAC });
    expect(await migrateLegacyHomeIfNeeded({ oldHome, newHome, rcFile, platform: MAC })).toBe('not-needed');
  });

  it('dangling current link is dropped silently', async () => {
    mkJdk('temurin-21.0.5+11');
    fs.symlinkSync(path.join(oldHome, 'jdks', 'gone'), path.join(oldHome, 'current'));
    const result = await migrateLegacyHomeIfNeeded({ oldHome, newHome, rcFile, platform: MAC });
    expect(result).toBe('migrated');
    expect(fs.existsSync(path.join(newHome, 'current'))).toBe(false);
    expect(fs.existsSync(path.join(newHome, 'current-java'))).toBe(false);
  });
});
