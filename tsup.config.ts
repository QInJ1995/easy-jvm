import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  splitting: false,
  shims: false,
  dts: false,
  // 脚本安装解压的是 npm pack 产物，不含 node_modules；依赖必须打进 dist
  noExternal: ['commander', 'picocolors'],
});
