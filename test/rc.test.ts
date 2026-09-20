import { describe, expect, it } from 'vitest';
import { RC_BEGIN, RC_END, rcBlock, stripRcBlock, upsertRcContent } from '../src/shell/rc.js';

describe('rc block', () => {
  it('appends to empty content', () => {
    const out = upsertRcContent('');
    expect(out).toContain(RC_BEGIN);
    expect(out).toContain(RC_END);
    expect(out).toContain('export JAVA_HOME="$HOME/.jvm/current"');
  });

  it('idempotent: exactly one block after two upserts', () => {
    const once = upsertRcContent('export FOO=1\n');
    const twice = upsertRcContent(once);
    expect(twice.split(RC_BEGIN).length - 1).toBe(1);
    expect(twice.split(RC_END).length - 1).toBe(1);
    expect(twice).toContain('export FOO=1');
  });

  it('strip removes block and restores original', () => {
    const original = 'export A=1\n\nexport B=2\n';
    const withBlock = upsertRcContent(original);
    const stripped = stripRcBlock(withBlock).replace(/\s+$/, '') + '\n';
    expect(stripped).toBe(original);
  });

  it('path guard present', () => {
    expect(rcBlock()).toContain('case ":$PATH:"');
  });
});
