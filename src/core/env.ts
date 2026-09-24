/**
 * 环境变量读取：新名优先，旧名（JVM_*）永久作为别名回退，
 * 保证从 easy-jvm 时代迁移过来的用户配置持续生效。
 */
export function envOverride(newName: string, legacyName: string): string | undefined {
  const fresh = process.env[newName];
  if (fresh !== undefined && fresh !== '') return fresh;
  const legacy = process.env[legacyName];
  if (legacy !== undefined && legacy !== '') return legacy;
  return undefined;
}
