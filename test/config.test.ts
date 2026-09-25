import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig, saveConfig } from '../src/core/config.js';

let home: string;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'jvm-config-'));
  process.env.SDKVM_HOME = home;
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
  delete process.env.SDKVM_HOME;
});

describe('config', () => {
  it('defaults when missing', () => {
    const c = loadConfig();
    expect(c.defaultVendor).toBe('temurin');
    expect(c.mirror.temurin).toBeUndefined();
  });

  it('roundtrip', () => {
    const c = loadConfig();
    c.mirror.temurin = 'https://mirrors.nju.edu.cn/adoptium';
    saveConfig(c);
    expect(loadConfig().mirror.temurin).toBe('https://mirrors.nju.edu.cn/adoptium');
  });

  it('corrupt file → backup + defaults', () => {
    fs.writeFileSync(path.join(home, 'config.json'), '{not json');
    const c = loadConfig();
    expect(c.defaultVendor).toBe('temurin');
    expect(fs.existsSync(path.join(home, 'config.json.bak'))).toBe(true);
  });

  it('invalid vendor falls back to temurin', () => {
    fs.writeFileSync(
      path.join(home, 'config.json'),
      JSON.stringify({ version: 1, defaultVendor: 'unknown' }),
    );
    expect(loadConfig().defaultVendor).toBe('temurin');
  });
});
