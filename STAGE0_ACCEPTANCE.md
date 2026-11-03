# 阶段 0 普通终端验收清单

> 目的：在非沙箱的普通终端中验证阶段 0 的安装、构建、路由与设置持久化。
> 当前仓库中的 `node_modules` 是在沙箱内用 `npm install --ignore-scripts` 安装的；请先删除它，再执行标准安装。

## 0. 前置条件

- 在项目根目录执行：`D:\1\Desktop\dsh1`
- Windows PowerShell（其他终端可自行替换删除命令）
- Node.js 满足 Vite 7 要求：`^20.19.0` 或 `>=22.12.0`
- npm 10 或以上

## 1. 版本检查

```powershell
node -v
npm -v
```

预期：

- Node 输出 `v20.19.x`、`v22.12+` 或 `v24.x`
- npm 输出 `10.x` 或以上

## 2. 干净安装

先删除沙箱内生成的依赖目录，保留 `package-lock.json`：

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

预期：

- 退出码为 0
- 输出包含 `added ... packages`
- 不出现 `npm ERR!`
- 不出现 `spawn EPERM`
- esbuild 的 `postinstall` 正常完成
- 最后可以出现 audit / funding 提示，这不影响验收

可选核验 esbuild 与 Tailwind 原生依赖：

```powershell
node -e "console.log('esbuild', require('esbuild').version)"
node -e "const o=require('@tailwindcss/oxide'); console.log('oxide', typeof o.Scanner)"
```

预期：

- `esbuild 0.28.2`
- `oxide function`

## 3. 类型检查

```powershell
npm run typecheck
```

预期：

- 退出码为 0
- 终端没有 TypeScript 错误输出

## 4. 生产构建

```powershell
npm run build
```

预期：

- 退出码为 0
- 看到 `vite v7.3.7 building for production...`
- 看到 `✓ built in ...`
- 生成 `dist/index.html` 与 `dist/assets/` 下的 JS/CSS 文件
- 不出现 `spawn EPERM`、`Cannot find package` 或 Tailwind 编译错误

## 5. 启动开发服务器

```powershell
npm run dev
```

预期：

- 输出 `VITE v7.3.7 ready in ... ms`
- 输出本地地址，例如 `http://localhost:5173/`
- 保持该终端运行，不要关闭

## 6. 路由检查

在浏览器中逐页打开，确认标题或关键文案出现：

| 地址 | 预期内容 |
| --- | --- |
| `http://localhost:5173/` | `四级词闯关`、今日学习、开始闯关 |
| `/map` | `关卡地图`、第 1—6 章、每章 5 个节点 |
| `/play/c1-l1` | `第 1 章 · 第 1 关`、`答题页已就位` |
| `/result/c1-l1` | `关卡结算`、`本局成绩将在阶段 4 生成` |
| `/wrongbook` | `错词本`、`还没有错词` |
| `/leaderboard` | `排行榜`、`本周榜`、`总榜` |
| `/pk` | `好友 PK`、`你的对战码` |
| `/settings` | `设置`、`偏好设置`、`本地数据` |
| `/does-not-exist` | `页面不存在`、`404` |

额外检查：

- 在 `/settings` 和 `/play/c1-l1` 直接按 F5 刷新，页面应正常恢复，不应出现 404。
- 从首页点击“开始闯关”进入地图，再点任意关卡进入答题页，点“模拟进入结算”进入结算页。
- 结算页的“再来一次”“下一关”“复习错词”链接均可点击。
- 浏览器控制台没有红色报错（允许 audit/funding 类终端提示，不允许页面 JS 异常）。

## 7. 设置持久化

1. 打开 `/settings`。
2. 关闭“音效”开关。
3. 等待“最近保存 HH:mm:ss”更新。
4. 按 F5 刷新页面。
5. 确认“音效”仍为关闭状态。
6. 打开 DevTools → Application → IndexedDB → `cet4-word-quest` → `settings`，确认存在记录，且 `soundEnabled` 为 `false`。
7. 重新打开“音效”，刷新后确认仍为开启状态。

预期：

- 刷新不丢失开关状态
- IndexedDB 中存在 `settings` 记录
- 页面无报错

可选：点击“重置学习进度”，确认弹窗后页面不报错，设置仍保留。

## 8. 移动端布局

在 DevTools 设备模式分别设置为：

- 375 × 812
- 430 × 932

检查 `/`、`/map`、`/play/c1-l1`、`/settings`：

- 页面无横向滚动条
- 文字不溢出卡片
- 按钮可点击，触控区域足够

可在控制台执行：

```js
({
  innerWidth: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
});
```

预期：`horizontalOverflow: false`。

## 9. 请贴回以下内容

1. `node -v && npm -v` 输出
2. `npm install` 的最后 15 行；如果失败，贴完整错误
3. `npm run typecheck` 输出
4. `npm run build` 完整输出
5. `npm run dev` 启动行
6. 路由检查中失败的页面（若全部正常，写“全部正常”）
7. 浏览器控制台红色报错（若有）
8. 375px / 430px 的 `horizontalOverflow` 结果
9. 操作系统版本与浏览器版本

如果构建失败，请额外提供：

```powershell
npm ls --depth=0
npm config get registry
```

并附上完整报错。不要先自行降级版本；先根据报错判断是环境问题、依赖问题还是版本栈问题。

## 10. 通过标准

以下全部满足即判定阶段 0 通过：

- 标准 `npm install` 无错误
- `npm run typecheck` 通过
- `npm run build` 通过
- `npm run dev` 可启动
- 8 个正式路由与 404 均可访问
- 刷新后设置开关状态保留
- 375px 与 430px 下无横向溢出
- 浏览器控制台无页面级 JS 报错

## 备注：关于 `--ignore-scripts`

- `--ignore-scripts` 会跳过 esbuild 的 `postinstall` 校验；本仓库当前依赖已验证 esbuild 二进制哈希与版本，但正式安装仍应使用标准 `npm install`。
- Tailwind 4 的 `@tailwindcss/vite` 与 `@tailwindcss/oxide` 没有安装期脚本；它们依赖随包发布的平台原生模块。
- 因此不需要为了 Tailwind 额外执行脚本，但**不要**在普通终端首次安装时使用 `--ignore-scripts`。
