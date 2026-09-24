/** 统一错误类型：携带退出码与可选修复提示，由入口统一捕获输出 */
export class SdkvmError extends Error {
  readonly exitCode: number;
  readonly hint?: string;

  constructor(message: string, opts: { exitCode?: number; hint?: string } = {}) {
    super(message);
    this.name = 'SdkvmError';
    this.exitCode = opts.exitCode ?? 1;
    this.hint = opts.hint;
  }
}

export function toSdkvmError(err: unknown): SdkvmError {
  if (err instanceof SdkvmError) return err;
  if (err instanceof Error) return new SdkvmError(err.message, { hint: err.stack });
  return new SdkvmError(String(err));
}
