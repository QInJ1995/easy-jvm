import os from 'node:os';
import path from 'node:path';

/** $SHELL → rc 文件。返回 null 表示无法自动判断（打印手动配置片段） */
export function detectRcFile(platform: 'mac' | 'linux' | 'windows'): string | null {
  if (platform === 'windows') return null;
  const shell = process.env.SHELL ?? '';
  const base = path.basename(shell);
  const home = os.homedir();
  if (base === 'zsh' || base === '-zsh') return path.join(home, '.zshrc');
  if (base === 'bash' || base === '-bash') {
    // macOS Terminal 默认 login shell 读 .bash_profile；Linux 交互 shell 读 .bashrc
    return platform === 'mac' ? path.join(home, '.bash_profile') : path.join(home, '.bashrc');
  }
  if (base === 'fish') return null; // fish 语法不同，打印手动片段
  return null;
}
