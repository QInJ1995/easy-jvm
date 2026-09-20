import fs from 'node:fs';

export const RC_BEGIN = '# >>> jvm init >>>';
export const RC_END = '# <<< jvm init <<<';

/** 标记块内容：JAVA_HOME 指向 current 链接；case 守卫防 PATH 重复叠加 */
export function rcBlock(): string {
  return [
    RC_BEGIN,
    'export JAVA_HOME="$HOME/.jvm/current"',
    'case ":$PATH:" in *":$JAVA_HOME/bin:"*) ;; *) export PATH="$JAVA_HOME/bin:$PATH";; esac',
    RC_END,
  ].join('\n');
}

/** 删除已有标记块（幂等） */
export function stripRcBlock(content: string): string {
  const re = new RegExp(`\\n*${escapeRegex(RC_BEGIN)}[\\s\\S]*?${escapeRegex(RC_END)}\\n*`, 'g');
  return content.replace(re, '\n');
}

/** 确保文件末尾恰好包含一个标记块；返回最终文件内容 */
export function upsertRcContent(content: string): string {
  const stripped = stripRcBlock(content).replace(/\s+$/, '');
  return `${stripped}\n\n${rcBlock()}\n`;
}

/** 写入 rc 文件（不存在则创建） */
export function upsertRcFile(file: string): void {
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  fs.writeFileSync(file, upsertRcContent(content));
}

export function removeRcBlockFromFile(file: string): void {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const stripped = stripRcBlock(content);
  if (stripped !== content) fs.writeFileSync(file, stripped);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
