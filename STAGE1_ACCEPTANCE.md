# 阶段 1 普通终端验收清单

> 当前状态：300 词数据、词库服务、严格校验与文档已完成；全量词库校验通过。
> 当前 DSH 沙箱禁止 Vite 启动 esbuild 子进程，因此 `npm run build` 与浏览器自检需在普通终端完成。

## 0. 前置条件

- 项目根目录：`D:\1\Desktop\dsh1`
- Node.js `^20.19.0` 或 `>=22.12.0`
- npm 10 或以上
- 标准安装依赖，不要使用 `--ignore-scripts`

## 1. 全量词库校验

```powershell
npm run vocab:validate
```

预期：

```text
[chapter 1] 50 words OK · 4 POS · unique IDs/words OK
[chapter 2] 50 words OK · 6 POS · unique IDs/words OK
[chapter 3] 50 words OK · 6 POS · unique IDs/words OK
[chapter 4] 50 words OK · 4 POS · unique IDs/words OK
[chapter 5] 50 words OK · 4 POS · unique IDs/words OK
[chapter 6] 50 words OK · 5 POS · unique IDs/words OK

Result: 6 chapter(s) / 300 words / 0 errors
All checks passed.
```

## 2. 类型检查

```powershell
npm run typecheck
```

预期：退出码 0，无 TypeScript 错误输出。

## 3. 生产构建

```powershell
npm run build
```

预期流程：

1. `prebuild` 自动运行 `npm run vocab:validate`，显示 `6 chapter(s) / 300 words / 0 errors`；
2. `tsc --noEmit` 通过；
3. Vite 输出类似：

```text
vite v7.3.7 building for production...
✓ ... modules transformed.
dist/index.html
dist/assets/index-*.css
dist/assets/index-*.js
dist/assets/chapter-1-*.js
dist/assets/chapter-2-*.js
dist/assets/chapter-3-*.js
dist/assets/chapter-4-*.js
dist/assets/chapter-5-*.js
dist/assets/chapter-6-*.js
✓ built in ...ms
```

重点确认：

- 退出码 0
- `dist/` 已生成
- `dist/assets/` 下能看到 6 个章节 chunk（文件名可能带哈希）

## 4. 开发服务器

```powershell
npm run dev
```

预期：

```text
VITE v7.3.7 ready in ... ms
➜ Local: http://localhost:5173/
```

保持终端运行。

## 5. 设置页词库自检

1. 打开 `http://localhost:5173/settings`
2. 在“词库信息”中确认：
   - 版本：`2026.10-sample-300`
   - 300 词 / 6 章
   - 每章 50 词
3. 点击“检查词库”
4. 预期显示：

```text
6 章 / 300 词，校验通过
```

5. 打开 DevTools → Network，确认点击后按需加载了 6 个章节 chunk；首页首次加载时不应加载章节 JSON。

## 6. 请贴回

1. `npm run vocab:validate` 完整输出
2. `npm run typecheck` 输出
3. `npm run build` 完整输出（特别是 chunk 列表）
4. `npm run dev` 启动行
5. 设置页“检查词库”的结果截图或文字
6. 浏览器控制台是否有项目相关报错

## 7. 通过标准

- 6 章 / 300 词 / 0 errors
- `typecheck` 通过
- `build` 成功，生成 6 个章节 chunk
- 设置页自检显示“6 章 / 300 词，校验通过”
- 首页不预加载全部章节 JSON
- 无项目代码导致的页面报错
