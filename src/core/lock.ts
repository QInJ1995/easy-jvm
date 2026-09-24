import fs from 'node:fs';
import { paths } from './paths.js';
import { SdkvmError } from '../util/errors.js';

const STALE_MS = 5 * 60 * 1000;

/** mkdir 原子锁：防止并发 install/uninstall 写冲突 */
export function acquireLock(): void {
  const lockDir = paths.lock();
  fs.mkdirSync(paths.root(), { recursive: true });
  try {
    fs.mkdirSync(lockDir);
    fs.writeFileSync(
      `${lockDir}/info.json`,
      JSON.stringify({ pid: process.pid, startedAt: Date.now() }),
    );
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'EEXIST') {
      const stat = fs.statSync(lockDir);
      if (Date.now() - stat.mtimeMs > STALE_MS) {
        fs.rmSync(lockDir, { recursive: true, force: true });
        return acquireLock();
      }
      throw new SdkvmError('Another jvm operation is in progress', {
        hint: 'If this is wrong, remove ~/.jvm/.lock manually.',
      });
    }
    throw e;
  }
}

export function releaseLock(): void {
  fs.rmSync(paths.lock(), { recursive: true, force: true });
}

export async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  acquireLock();
  try {
    return await fn();
  } finally {
    releaseLock();
  }
}
