const WIDTH = 26;

function humanBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)}${units[i]}`;
}

/** stderr 单行进度条；非 TTY 降级为每 16MB 打一行 */
export function createProgress(label: string) {
  const isTty = process.stderr.isTTY === true;
  let lastLine = 0;

  return {
    update(bytes: number, total: number | null): void {
      if (isTty) {
        const ratio = total ? Math.min(1, bytes / total) : null;
        const bar =
          ratio === null
            ? humanBytes(bytes)
            : `${'█'.repeat(Math.round(ratio * WIDTH))}${'░'.repeat(WIDTH - Math.round(ratio * WIDTH))} ${(ratio * 100).toFixed(1)}%`;
        process.stderr.write(`\r${label} ${bar}`.padEnd(72));
      } else if (bytes - lastLine >= 16 * 1024 * 1024) {
        lastLine = bytes;
        process.stderr.write(`${label} ${humanBytes(bytes)}${total ? ` / ${humanBytes(total)}` : ''}\n`);
      }
    },
    done(bytes: number, total: number | null): void {
      if (isTty) {
        process.stderr.write(`\r${label} ${humanBytes(bytes)}${total ? ` / ${humanBytes(total)}` : ''} ✓\n`);
      } else if (bytes - lastLine >= 0) {
        process.stderr.write(`${label} ${humanBytes(bytes)} complete\n`);
      }
    },
  };
}
