import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { httpFetch } from './http.js';
import { SdkvmError } from '../util/errors.js';

export interface DownloadResult {
  file: string;
  sha256: string;
  bytes: number;
}

/** 流式下载到 .part（边下边算 sha256），完成后原子 rename */
export async function downloadFile(
  url: string,
  destFile: string,
  onProgress?: (bytes: number, total: number | null) => void,
): Promise<DownloadResult> {
  const res = await httpFetch(url);
  const total = Number(res.headers.get('content-length')) || null;
  const partFile = `${destFile}.part`;
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(partFile);
  let bytes = 0;

  try {
    if (!res.body) throw new SdkvmError(`Empty response body: ${url}`);
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      out.write(chunk);
      hash.update(chunk);
      bytes += chunk.byteLength;
      onProgress?.(bytes, total);
    }
    await new Promise<void>((resolve, reject) => {
      out.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    out.destroy();
    fs.rmSync(partFile, { force: true });
    throw err;
  }

  if (total !== null && bytes !== total) {
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
