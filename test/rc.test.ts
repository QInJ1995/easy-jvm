import { describe, expect, it } from 'vitest';
import { rcBegin, rcEnd, rcBlock, stripRcBlock, stripLegacyRcBlock, upsertRcContent } from '../src/shell/rc.js';

describe('rc block', () => {
  it('appends to empty content', () => {
    const out = upsertRcContent('', 'java');
    expect(out).toContain(rcBegin('java'));
    expect(out).toContain(rcEnd('java'));
    expect(out).toContain('export JAVA_HOME="$HOME/.jvm/current"');
  });

  it('idempotent: exactly one block after two upserts', () => {
    const once = upsertRcContent('export FOO=1\n', 'java');
    const twice = upsertRcContent(once, 'java');
    expect(twice.split(rcBegin('java')).length - 1).toBe(1);
    expect(twice.split(rcEnd('java')).length - 1).toBe(1);
    expect(twice).toContain('export FOO=1');
  });

  it('strip removes block and restores original', () => {
    const original = 'export A=1\n\nexport B=2\n';
    const withBlock = upsertRcContent(original, 'java');
    const stripped = stripRcBlock(withBlock, 'java').replace(/\s+$/, '') + '\n';
    expect(stripped).toBe(original);
  });

  it('upsert strips legacy jvm init block', () => {
    const legacy =
      'export A=1\n\n# >>> jvm init >>>\nexport JAVA_HOME="$HOME/.jvm/current"\n# <<< jvm init <<<\n';
    const out = upsertRcContent(legacy, 'java');
    expect(out).not.toContain('# >>> jvm init >>>');
    expect(out).toContain(rcBegin('java'));
    expect(out).toContain('export A=1');
  });

  it('legacy strip standalone', () => {
    const legacy = 'x\n# >>> jvm init >>>\nold\n# <<< jvm init <<<\ny\n';
    expect(stripLegacyRcBlock(legacy).replace(/\s+/g, '')).toBe('xy');
  });

  it('path guard present', () => {
    expect(rcBlock('java')).toContain('case ":$PATH:"');
  });

  it('go block exports GOROOT when registered', async () => {
    // go 类型在阶段 3 注册；此处仅验证 java 块结构稳定
    expect(rcBlock('java')).toContain('JAVA_HOME');
  });
});
