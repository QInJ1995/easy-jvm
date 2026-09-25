import crypto from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { httpFetch } from './http.js';
import { SdkvmError } from '../util/errors.js';

export interface DownloadResult {
  file: string;
  sha256: string;
  bytes: number;
}

/** 流式下载到 .part（边下边算 sha256），完成后原子 rename。
 * 超时语义是「空闲」而非总时长：每个 chunk 刷新计时器，避免大归档（Flutter ~2GB）被总时长掐断。 */
const IDLE_TIMEOUT_MS = 60_000;

export async function downloadFile(
  url: string,
  destFile: string,
  onProgress?: (bytes: number, total: number | null) => void,
): Promise<DownloadResult> {
  const partFile = `${destFile}.part`;
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(partFile);
  let bytes = 0;
  let total: number | null = null;
  let encoded = false;
  let stalled = false;
  const ac = new AbortController();
  const timer = setTimeout(() => {
    stalled = true;
    ac.abort();
  }, IDLE_TIMEOUT_MS);

  try {
    // 显式 identity：部分 CDN 边缘会对归档做透明 gzip，解压后字节数与 content-length 不可比
    const res = await httpFetch(url, {
      signal: ac.signal,
      headers: { 'accept-encoding': 'identity' },
    });
    timer.refresh(); // 响应头到达，转入流式阶段
    total = Number(res.headers.get('content-length')) || null;
    // 若服务端仍坚持压缩（undici 透明解压），长度校验失效，完整性交给 sha256
    encoded = Boolean(res.headers.get('content-encoding'));
    if (!res.body) throw new SdkvmError(`Empty response body: ${url}`);
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      timer.refresh();
      if (!out.write(chunk)) await once(out, 'drain');
      hash.update(chunk);
      bytes += chunk.byteLength;
      onProgress?.(bytes, total);
    }
    await new Promise<void>((resolve, reject) => {
      out.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    // 等 close 再继续，销毁中的流错误不再外抛（避免未处理的 'error' 事件把进程打崩）
    await new Promise<void>((resolve) => {
      out.once('close', resolve);
      out.destroy();
    });
    fs.rmSync(partFile, { force: true });
    if (stalled) {
      throw new SdkvmError(`Download stalled: no data for ${IDLE_TIMEOUT_MS / 1000}s (${bytes} bytes so far)`, {
        hint: url,
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (bytes === 0) {
    fs.rmSync(partFile, { force: true });
    throw new SdkvmError(`Download incomplete: 0 bytes`, { hint: url });
  }
  if (total !== null && !encoded && bytes !== total) {
    fs.rmSync(partFile, { force: true });
    throw new SdkvmError(`Download incomplete: ${bytes}/${total} bytes`, { hint: url });
  }
  fs.renameSync(partFile, destFile);
  return { file: destFile, sha256: hash.digest('hex'), bytes };
}

export function cacheFileName(url: string): string {
  const safe = path.basename(new URL(url).pathname).replace(/[^\w.+-]/g, '_');
  return safe || `download-${Date.now()}`;
}
