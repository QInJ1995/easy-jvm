import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from '../src/net/download.js';

let dir: string;
const realFetch = globalThis.fetch;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'sdkvm-dl-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

/** 构造一个可控响应：content-length/content-encoding 由用例指定，body 为明文 */
function stubFetch(body: string, headers: Record<string, string>) {
  const calls: Array<Record<string, unknown>> = [];
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    calls.push(init?.headers as Record<string, unknown>);
    return new Response(body, { status: 200, headers });
  }) as typeof fetch;
  return calls;
}

describe('downloadFile 长度校验', () => {
  it('identity 响应：字节数与 content-length 一致时成功', async () => {
    const calls = stubFetch('hello world', { 'content-length': '11' });
    const dest = path.join(dir, 'a.zip');
    const r = await downloadFile('https://example.com/a.zip', dest);
    expect(r.bytes).toBe(11);
    expect(r.sha256).toBe(crypto.createHash('sha256').update('hello world').digest('hex'));
    // 显式要求不压缩
    expect(calls[0]).toMatchObject({ 'accept-encoding': 'identity' });
  });

  it('透明压缩（content-encoding 存在）：解压后字节数 > content-length 不再误判不完整', async () => {
    // 11 字节解压体 vs 线缆上 3 字节的“压缩长度”——正是 windows CI go zip 踩中的形态
    stubFetch('hello world', { 'content-length': '3', 'content-encoding': 'gzip' });
    const dest = path.join(dir, 'b.zip');
    const r = await downloadFile('https://example.com/b.zip', dest);
    expect(r.bytes).toBe(11);
    expect(r.sha256).toBe(crypto.createHash('sha256').update('hello world').digest('hex'));
  });

  it('无 content-encoding 且截断：仍硬失败并清理 .part', async () => {
    stubFetch('hello', { 'content-length': '11' });
    const dest = path.join(dir, 'c.zip');
    await expect(downloadFile('https://example.com/c.zip', dest)).rejects.toThrow(
      /Download incomplete: 5\/11 bytes/,
    );
    expect(existsSync(`${dest}.part`)).toBe(false);
  });
});
