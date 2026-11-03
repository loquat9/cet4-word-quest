import { constants } from 'node:fs';
import {
  access,
  copyFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * GitHub Pages 没有 SPA rewrite 配置。
 * 复制 index.html 为 404.html，让 /play/c1-l1 等深链接仍能加载应用。
 */

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const distDir = path.join(projectRoot, 'dist');
const indexFile = path.join(distDir, 'index.html');
const fallbackFile = path.join(distDir, '404.html');

try {
  await access(indexFile, constants.R_OK);
  await copyFile(indexFile, fallbackFile);
  console.log(
    '[postbuild] 已生成 dist/404.html（GitHub Pages SPA 回退）',
  );
} catch (error) {
  console.error('[postbuild] 无法生成 404.html', error);
  process.exitCode = 1;
}
