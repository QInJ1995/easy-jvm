import type { SdkVersion } from '../core/version.js';
import { compareVersions, formatGoVersion, parseGoDirName, parseGoUserSpec } from '../core/version.js';
import { GO_VENDORS } from '../vendor/index.js';
import type { SdkTypeSpec } from './types.js';

export const goSdk: SdkTypeSpec = {
  id: 'go',
  label: 'Go',
  installDirName: 'gos',
  currentLinkName: 'current-go',
  envVar: 'GOROOT',
  supportsLts: false,
  vendors: GO_VENDORS,
  parseUserSpec: parseGoUserSpec,
  parseDirName: parseGoDirName,
  formatVersion: formatGoVersion,
  compareVersions,
  binRelPath(platform) {
    return `bin/${platform.os === 'windows' ? 'go.exe' : 'go'}`;
  },
  // go 归档是单根 go/ 目录，无 macOS bundle 概念
  locateHome: (root) => root,
  versionCheck: { args: ['version'], stream: 'stdout' },
};

export type { SdkVersion };
