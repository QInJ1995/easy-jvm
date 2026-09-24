import fs from 'node:fs';
import path from 'node:path';
import type { SdkVersion } from '../core/version.js';
import {
  compareVersions,
  formatVersion,
  parseDirName,
  parseUserSpec,
} from '../core/version.js';
import { JAVA_VENDORS } from '../vendor/index.js';
import type { SdkTypeSpec } from './types.js';

export const javaSdk: SdkTypeSpec = {
  id: 'java',
  label: 'Java (JDK)',
  installDirName: 'jdks',
  currentLinkName: 'current',
  envVar: 'JAVA_HOME',
  supportsLts: true,
  vendors: JAVA_VENDORS,
  parseUserSpec,
  parseDirName,
  formatVersion,
  compareVersions,
  binRelPath(platform) {
    return `bin/${platform.os === 'windows' ? 'java.exe' : 'java'}`;
  },
  locateHome(root) {
    // macOS JDK 是 bundle：环境语义目录在 Contents/Home
    const contentsHome = path.join(root, 'Contents', 'Home');
    return fs.existsSync(path.join(contentsHome, 'bin')) ? contentsHome : root;
  },
  versionCheck: { args: ['-version'], stream: 'stderr' },
};

export type { SdkVersion };
