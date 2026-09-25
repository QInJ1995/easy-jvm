import fs from 'node:fs';
import { paths } from './paths.js';
import { SdkvmError } from '../util/errors.js';

const STALE_MS = 5 * 60 * 1000;
/** 持锁期间刷新 mtime，避免长下载被当成 stale */
const HEARTBEAT_MS = 60 * 1000;

function lockInfoPath(): string {
  return `${paths.lock()}/info.json`;
}

function readLockPid(): number | null {
  try {
    const raw = fs.readFileSync(lockInfoPath(), 'utf8');
    const parsed = JSON.parse(raw) as { pid?: unknown };
    return typeof parsed.pid === 'number' ? parsed.pid : null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  if (pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function writeLockInfo(startedAt: number): void {
  fs.writeFileSync(
    lockInfoPath(),
    JSON.stringify({ pid: process.pid, startedAt, heartbeatAt: Date.now() }),
  );
}

function touchLock(): void {
  const lockDir = paths.lock();
  if (!fs.existsSync(lockDir)) return;
  const now = new Date();
  try {
    fs.utimesSync(lockDir, now, now);
  } catch {
    // ignore
  }
  try {
    const pid = readLockPid() ?? process.pid;
    let startedAt = Date.now();
    try {
      const raw = JSON.parse(fs.readFileSync(lockInfoPath(), 'utf8')) as { startedAt?: number };
      if (typeof raw.startedAt === 'number') startedAt = raw.startedAt;
    } catch {
      // rewrite below
    }
    if (pid === process.pid) writeLockInfo(startedAt);
  } catch {
    // ignore
  }
}

/** mkdir 原子锁：防止并发 install/uninstall 写冲突 */
export function acquireLock(): void {
  const lockDir = paths.lock();
  fs.mkdirSync(paths.root(), { recursive: true });
  try {
    fs.mkdirSync(lockDir);
    writeLockInfo(Date.now());
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'EEXIST') {
      const holder = readLockPid();
      if (holder != null && !isProcessAlive(holder)) {
        fs.rmSync(lockDir, { recursive: true, force: true });
        return acquireLock();
      }
      const stat = fs.statSync(lockDir);
      if (Date.now() - stat.mtimeMs > STALE_MS) {
        fs.rmSync(lockDir, { recursive: true, force: true });
        return acquireLock();
      }
      throw new SdkvmError('Another sdkvm operation is in progress', {
        hint: 'If this is wrong, remove ~/.sdkvm/.lock manually.',
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
  const timer = setInterval(() => touchLock(), HEARTBEAT_MS);
  // 不让 timer 拖住进程退出
  timer.unref?.();
  try {
    return await fn();
  } finally {
    clearInterval(timer);
    releaseLock();
  }
}
