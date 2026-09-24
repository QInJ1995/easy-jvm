import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findInstalled, listInstalled } from '../src/core/registry.js';
import { SdkvmError } from '../src/util/errors.js';

let home: string;

function mkJdk(dirName: string): void {
  fs.mkdirSync(path.join(home, 'jdks', dirName), { recursive: true });
}

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'jvm-registry-'));
  process.env.JVM_HOME = home;
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
  delete process.env.JVM_HOME;
});

describe('registry', () => {
  it('lists and sorts installed', () => {
    mkJdk('temurin-21.0.5+11');
    mkJdk('zulu-21.0.12.1');
    mkJdk('temurin-17.0.13+11');
    const list = listInstalled('java');
    expect(list.map((j) => j.version.major)).toEqual([17, 21, 21]);
    expect(list[0]?.version.vendor).toBe('temurin');
  });

  it('ignores non-jdk dirs', () => {
    mkJdk('temurin-21.0.5+11');
    fs.mkdirSync(path.join(home, 'jdks', 'random'));
    expect(listInstalled('java')).toHaveLength(1);
  });

  it('major match picks highest across vendors', () => {
    mkJdk('temurin-21.0.5+11');
    mkJdk('zulu-21.0.12.1');
    expect(findInstalled('java', '21').dirPath.endsWith('zulu-21.0.12.1')).toBe(true);
  });

  it('vendor prefix match', () => {
    mkJdk('temurin-21.0.5+11');
    mkJdk('zulu-21.0.12.1');
    expect(findInstalled('java', 'temurin-21').dirPath.endsWith('temurin-21.0.5+11')).toBe(true);
  });

  it('full prefix match ignores build', () => {
    mkJdk('temurin-21.0.5+11');
    expect(findInstalled('java', '21.0.5').dirPath.endsWith('temurin-21.0.5+11')).toBe(true);
  });

  it('lts match', () => {
    mkJdk('temurin-21.0.5+11');
    mkJdk('temurin-22.0.1+2');
    expect(findInstalled('java', 'lts').version.major).toBe(21);
  });

  it('no match throws with installed list', () => {
    mkJdk('temurin-21.0.5+11');
    try {
      findInstalled('java', '99');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SdkvmError);
      expect((e as SdkvmError).hint).toContain('temurin-21.0.5+11');
    }
  });
});
