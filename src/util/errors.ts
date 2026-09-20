/** 统一错误类型：携带退出码与可选修复提示，由入口统一捕获输出 */
export class JvmError extends Error {
  readonly exitCode: number;
  readonly hint?: string;

  constructor(message: string, opts: { exitCode?: number; hint?: string } = {}) {
    super(message);
    this.name = 'JvmError';
    this.exitCode = opts.exitCode ?? 1;
    this.hint = opts.hint;
  }
}

export function toJvmError(err: unknown): JvmError {
  if (err instanceof JvmError) return err;
  if (err instanceof Error) return new JvmError(err.message, { hint: err.stack });
  return new JvmError(String(err));
}
