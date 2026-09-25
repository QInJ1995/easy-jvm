/** 读取非空环境变量；未设置或空串返回 undefined。 */
export function envGet(name: string): string | undefined {
  const value = process.env[name];
  if (value !== undefined && value !== '') return value;
  return undefined;
}
