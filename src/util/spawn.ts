import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { JvmError } from './errors.js';

const execFileAsync = promisify(execFile);

export async function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync(cmd, args, {
      cwd: opts.cwd,
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    const e = err as { stderr?: string; message?: string; code?: unknown };
    const detail = (e.stderr || e.message || '').split('\n')[0];
    throw new JvmError(`Failed to run ${cmd}: ${detail}`, {
      hint: `args: ${args.join(' ')}`,
    });
  }
}
