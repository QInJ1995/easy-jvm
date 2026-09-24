import type { SdkVersion } from '../core/version.js';
import { compareVersions, formatNodeVersion, parseNodeDirName, parseNodeUserSpec } from '../core/version.js';
import { NODE_VENDORS } from '../vendor/index.js';
import type { SdkTypeSpec } from './types.js';

export const nodeSdk: SdkTypeSpec = {
  id: 'node',
  label: 'Node.js',
  installDirName: 'nodes',
  currentLinkName: 'current-node',
  envVar: 'NODE_HOME',
  supportsLts: true,
  vendors: NODE_VENDORS,
  parseUserSpec: parseNodeUserSpec,
  parseDirName: parseNodeDirName,
  formatVersion: formatNodeVersion,
  compareVersions,
  binRelPath(platform) {
    // windows 归档没有 bin/，可执行文件在根目录
    return platform.os === 'windows' ? 'node.exe' : 'bin/node';
  },
  envBinSuffix(platform) {
    // 同上：windows 的 PATH entry 就是 %NODE_HOME% 本身
    return platform.os === 'windows' ? '' : '/bin';
  },
  // node 归档是单根 node-v{ver}-{plat}-{arch}/ 目录
  locateHome: (root) => root,
  versionCheck: { args: ['--version'], stream: 'stdout' },
};

export type { SdkVersion };
