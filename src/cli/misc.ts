import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { log } from '../ui/log.js';

export function getVersion(): string {
  const fallback = '0.1.0';
  try {
    // dist/index.js → 包根的 package.json（npm 全局安装布局）
    const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? fallback;
  } catch {
    return fallback;
  }
}

export function versionCommand(): void {
  log.raw(getVersion());
}
