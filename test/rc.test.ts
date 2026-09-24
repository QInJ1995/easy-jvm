import { describe, expect, it } from 'vitest';
import { rcBegin, rcEnd, rcBlock, stripRcBlock, stripLegacyRcBlock, upsertRcContent } from '../src/shell/rc.js';

describe('rc block', () => {
  it('appends to empty content', () => {
    const out = upsertRcContent('', 'java');
    expect(out).toContain(rcBegin('java'));
    expect(out).toContain(rcEnd('java'));
    expect(out).toContain('export JAVA_HOME="$HOME/.sdkvm/current-java"');
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

  it('go block exports GOROOT', () => {
    const block = rcBlock('go');
    expect(block).toContain('GOROOT=');
    expect(block).toContain('current-go');
    expect(block).toContain('case \":$PATH:\"');
  });

  it('root outside home falls back to absolute path', () => {
    process.env.SDKVM_HOME = '/opt/custom-root';
    try {
      const block = rcBlock('go');
      expect(block).toContain('"/opt/custom-root/current-go"');
      expect(block).not.toContain('$HOME/../');
    } finally {
      delete process.env.SDKVM_HOME;
    }
  });
});


describe('flutter rc block', () => {
  it('exports FLUTTER_ROOT pointing at current-flutter', () => {
    const block = rcBlock('flutter');
    expect(block).toContain('FLUTTER_ROOT=');
    expect(block).toContain('current-flutter');
    expect(block).toContain('case ":$PATH:"');
  });

  it('java / go / flutter blocks coexist independently', () => {
    let content = upsertRcContent('export A=1\n', 'java');
    content = upsertRcContent(content, 'flutter');
    expect(content).toContain(rcBegin('java'));
    expect(content).toContain('current-flutter');
    expect(content).toContain('export A=1');
  });
});

describe('node rc block', () => {
  it('exports NODE_HOME pointing at current-node', () => {
    const block = rcBlock('node');
    expect(block).toContain('NODE_HOME=');
    expect(block).toContain('current-node');
    expect(block).toContain('case ":$PATH:"');
    expect(block).toContain('"$HOME/.sdkvm/current-node"');
  });
});
