import fs from 'node:fs';
import path from 'node:path';
import type { VendorId } from '../vendor/types.js';
import {
  LTS_MAJORS,
  compareVersions,
  formatVersion,
  parseDirName,
  parseUserSpec,
  type JdkVersion,
} from './version.js';
import { paths } from './paths.js';
import { SdkvmError } from '../util/errors.js';
import { readCurrent } from '../fs/link.js';

export interface InstalledJdk {
  version: JdkVersion;
  dirPath: string;
  /** JAVA_HOME 语义路径（macOS bundle → Contents/Home） */
  javaHome: string;
}

function looksLikeMacBundle(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'Contents', 'Home', 'bin'));
}

/** 扫描 ~/.jvm/jdks/，按版本升序 */
export function listInstalled(): InstalledJdk[] {
  const root = paths.jdks();
  if (!fs.existsSync(root)) return [];
  const result: InstalledJdk[] = [];
  for (const name of fs.readdirSync(root)) {
    const version = parseDirName(name);
    if (!version) continue;
    const dirPath = path.join(root, name);
    if (!fs.statSync(dirPath).isDirectory()) continue;
    const javaHome = looksLikeMacBundle(dirPath)
      ? path.join(dirPath, 'Contents', 'Home')
      : dirPath;
    result.push({ version, dirPath, javaHome });
  }
  result.sort((a, b) => compareVersions(a.version, b.version));
  return result;
}

/** 当前 current 指向的已安装 JDK（无链接或悬空返回 null） */
export function currentJdk(): InstalledJdk | null {
  const current = readCurrent();
  if (!current) return null;
  return (
    listInstalled().find(
      (j) =>
        j.javaHome === current ||
        j.dirPath === current ||
        current.startsWith(j.dirPath + path.sep),
    ) ?? null
  );
}

/** 按用户输入匹配已安装版本：21 → 该 major 最新；21.0.5 → 前缀匹配；可带 vendor 前缀 */
export function findInstalled(specInput: string, vendorArg?: VendorId): InstalledJdk {
  const { vendor: specVendor, spec } = parseUserSpec(specInput);
  const vendor = vendorArg ?? specVendor;
  const all = listInstalled();
  const candidates = vendor ? all.filter((j) => j.version.vendor === vendor) : all;

  let matched: InstalledJdk[];
  if (spec.kind === 'major') {
    matched = candidates.filter((j) => j.version.major === spec.major);
  } else if (spec.kind === 'lts') {
    matched = candidates.filter((j) => LTS_MAJORS.has(j.version.major));
  } else {
    const v = spec.version;
    matched = candidates.filter((j) => {
      const f = formatVersion(j.version);
      return f === v || f.startsWith(`${v}+`) || f.startsWith(`${v}.`);
    });
  }

  if (matched.length === 0) {
    const installedList = all
      .map((j) => `  ${j.version.vendor}-${formatVersion(j.version)}`)
      .join('\n');
    const want = spec.kind === 'full' ? spec.version : specInput;
    throw new SdkvmError(`No installed JDK matches "${specInput}"`, {
      hint:
        (all.length > 0 ? `Installed:\n${installedList}\n` : '') +
        `Install one first: jvm install ${want}`,
    });
  }
  return matched[matched.length - 1] as InstalledJdk;
}
