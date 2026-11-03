# 四级词闯关

面向大学英语四级考生的移动端 H5 单词记忆小游戏。核心节奏为 **5 分钟一局**，通过章节闯关覆盖看词选义、看义选词、听音辨词、例句填空、听写拼写五类题型，并配套错词复习、发音、每日任务、学习统计、排行榜与好友 PK。

> 当前状态：**阶段 0—6 全部验收通过，项目收官**。300 词示例库、五类题型、发音与音效、错词复习、每日任务、学习统计、本地排行榜、同题 PK、地图星级/锁定与三平台部署配置均已完成。纯逻辑测试 **12 个文件 / 143 个用例**、`npm run typecheck`、`npm run build` 与浏览器实测全部通过。验收记录见 [STAGE6_ACCEPTANCE.md](STAGE6_ACCEPTANCE.md)；交接文档见 [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md)。

## 技术栈

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4（`@tailwindcss/vite`，主题 token 位于 `src/index.css`）
- React Router 7（`BrowserRouter`）
- Zustand 5
- idb 8（IndexedDB）

发音使用浏览器原生 **Web Speech API**（`SpeechSynthesis`），不引入第三方语音服务或外部音频接口。

## 环境要求

- Node.js >= 20.19.0
- npm >= 10
- 发音功能需要浏览器支持 `speechSynthesis`，并安装英语音色

## 安装与运行

```bash
npm install
npm run dev
```

开发服务器启动后，按终端提示打开本地地址。

> **普通终端首次安装请使用标准 `npm install`，不要添加 `--ignore-scripts`。** Vite 依赖的 esbuild 带有 `postinstall` 校验；跳过脚本会跳过该校验。Tailwind 4 的 `@tailwindcss/vite` 与 `@tailwindcss/oxide` 本身不依赖安装脚本，但仍建议使用标准安装以保证依赖完整性。
>
> 如果 `node_modules` 是在跳过脚本的情况下安装的，建议删除 `node_modules` 后重新执行 `npm install`。

阶段验收文档：

- [STAGE0_ACCEPTANCE.md](STAGE0_ACCEPTANCE.md)：项目初始化
- [STAGE1_ACCEPTANCE.md](STAGE1_ACCEPTANCE.md)：词库与数据层
- [STAGE2_ACCEPTANCE.md](STAGE2_ACCEPTANCE.md)：答题核心闭环
- [STAGE3_ACCEPTANCE.md](STAGE3_ACCEPTANCE.md)：五类题型与发音
- 阶段 4：错词本、复习调度、每日任务与统计（已验收，记录见交接文档）
- [STAGE5_ACCEPTANCE.md](STAGE5_ACCEPTANCE.md)：排行榜与好友 PK
- [STAGE6_ACCEPTANCE.md](STAGE6_ACCEPTANCE.md)：音效、地图、异常与部署

### 构建与预览

```bash
npm run build
npm run preview
```

`prebuild` 会先执行词库全量校验。当前构建会生成 6 个章节 chunk。

### 类型检查

```bash
npm run typecheck
```

### 单元测试

```bash
npm run test
npm run test:watch
```

当前覆盖判题、题目生成、题型配额、随机、音色、日期、复习调度、每日任务、学习统计、排行榜聚合、PK 编解码与地图解锁，共 **12 个测试文件、143 个用例**。

### 词库校验

```bash
npm run vocab:validate
npm run vocab:validate -- --chapter 1
```

`prebuild` 会自动运行全量校验，任何错误都会阻断 `npm run build`。当前 300 词全部通过全量校验。

词库字段规范、来源与替换说明见 [src/data/cet4/README.md](src/data/cet4/README.md)。

## 路由

| 路由 | 页面 | 当前状态 |
| --- | --- | --- |
| `/` | 首页 | 每日任务、学习统计、错词角标、功能入口 |
| `/map` | 关卡地图 | 真实锁定、最佳星级、总星星与继续闯关 |
| `/play/:levelId` | 答题页 | 五类题型、倒计时、3 心、连击、发音、听写提示；`levelId=pk` 为同题对战 |
| `/result/:levelId` | 结算页 | 普通/复习结算；`levelId=pk` 为 PK 结算 |
| `/wrongbook` | 错词本 | 总错词/待复习/已掌握、排序、发音、开始复习 |
| `/leaderboard` | 排行榜 | 本周榜/总榜、我的排名、8 位模拟好友 |
| `/pk` | 好友 PK | 发起对战、输入 6 位码、同题对战 |
| `/settings` | 设置 | 音效/发音开关、学习统计、词库自检、重置进度 |
| `*` | 404 | 未匹配路由 |

关卡 id 约定为 `c{1-6}-l{1-5}`，例如 `c1-l1`；复习关为 `review`，PK 为 `pk`。

## 目录结构

```text
src/
  components/
    AppErrorBoundary.tsx  全局渲染异常兜底
    home/           DailyTaskPanel、StatsGrid
    game/           GameTopBar、QuestionCard、OptionGrid、AudioButton、
                    DictationInput、AnswerFeedback、SpeechFallbackNotice
    leaderboard/    LeaderboardRow
    map/            LevelNode
    pk/             PkCodeDisplay、PkResultPanel
    wrongbook/      WrongWordItem
  pages/            各路由页面
  game/             规则、判题、题目生成、题型配额、计分、
                    复习调度、每日任务、学习统计、排行榜、地图状态纯逻辑
  store/            Zustand 状态（设置、玩家进度、当前局）
  services/         存储、词库、错词/复习、发音、音效、排行榜、PK
  services/speech/  发音服务与音色选择
  services/sound/   Web Audio 音效合成
  services/storage/ IndexedDB/localStorage/内存实现
  data/             章节配置、关卡配置、题型权重、每日任务、
                    模拟好友、CET-4 词库 JSON
  hooks/            启动水合、倒计时、发音、游戏音效、错词概览
  utils/            随机、格式化、日期/周 key、例句挖空、首字母提示
  types/            领域类型定义
scripts/            词库校验、构建后 404 回退
.github/workflows/  GitHub Pages 部署
```

## 主题

极简学习风：

- 白底 + 主色靛蓝 `#4F46E5`
- 答对绿 `#16A34A`、答错红 `#DC2626`
- 卡片圆角 16px、弱阴影
- 系统无衬线字体
- 动效仅淡入、卡片翻转与进度条过渡，时长 150—250ms
- 移动端优先，内容最大宽度 480px，桌面端居中

Tailwind 4 主题 token 定义在 `src/index.css` 的 `@theme` 中。

## 玩法规则

### 五类题型

| 题型 | 题目 | 作答方式 |
| --- | --- | --- |
| 看词选义 | 英文单词 + 音标 | 四选一中文释义 |
| 看义选词 | 中文释义 | 四选一英文单词 |
| 听音辨词 | 自动播放发音，不显示单词 | 四选一英文单词，可重播 |
| 例句填空 | 目标词挖空为 `____` 的英文例句 | 四选一英文单词 |
| 听写拼写 | 播放发音 + 中文释义 | 文本输入，回车提交 |

### 章节题型权重

| 章节 | 看词选义 | 看义选词 | 听音辨词 | 例句填空 | 听写拼写 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 基础认知 | 50% | 50% | — | — | — |
| 2 词义巩固 | 35% | 35% | 30% | — | — |
| 3 例句理解 | — | 25% | — | 75% | — |
| 4 听力强化 | — | — | 55% | — | 45% |
| 5 拼写输出 | — | — | 30% | — | 70% |
| 6 综合挑战 | 20% | 20% | 20% | 20% | 20% |

题量允许时，每种参与混合的题型至少出现 1 次；题型序列会尽量分散。

### 关卡与计分

- 普通关：12 / 13 / 14 / 15 题，5 分钟。
- Boss 关：16 题；第 6 章最终 Boss 18 题，4 分钟。
- 复习关：目标 12 题；错词不足 10 个时用同章词补足到 10。
- PK 关：固定第 6 章 12 题、5 分钟、3 心。
- 生命值 3；答错扣 1 心，连击清零。
- 答对 +1 分、+1 金币；连击 3 / 5 / 10 额外 +2 / +4 / +8 金币。
- 答对约 600ms 自动继续；答错 2 秒后继续，也可手动继续。
- 正确率 ≥90% / ≥75% / ≥60% 分别为 3 / 2 / 1 星。
- 错词自动写入 IndexedDB；星级 >0 时解锁下一关。

### 听写提示

- 首字母提示，例如 `a _ _ _ _ _ _`。
- 第 1—4 章 5 金币，第 5—6 章 8 金币，复习/PK 5 金币。
- 每题限用一次；金币立即扣除并持久化，本局退出不退还。

### 地图解锁与星级

- 初始解锁 `c1-l1`；至少 1 星通关后解锁下一关。
- 未解锁关卡显示锁图标且不可点击。
- 已通关关卡显示最佳星级（1—3 星，实心/空心）。
- 地图顶部显示总星星、已解锁数、已通关数，并提供“继续闯关”。
- 全部通关后“继续闯关”返回最后一个已解锁关卡。
- 星级与解锁全部来自 `unlockedLevelIds` / `levelProgress`，不额外存储。

## 音效与动画

- 答对、答错、通关三种轻提示音，使用 Web Audio API 合成，无外部音频文件。
- 设置页可静音；提供三种音效试听。
- iOS / Safari 在首次用户手势内解锁音频上下文。
- 不支持 `AudioContext` 时静默降级，不阻塞答题。
- 动画仅保留淡入、卡片翻转、进度条过渡；结算星星采用错峰淡入。
- `prefers-reduced-motion` 下自动缩短动画时长。

## 错词与间隔重复

- 错词本按错误次数降序、最近错误时间降序排序。
- 复习阶段：0 当天、1 次日、2 三天后、3 七天后、4 已掌握（30 天抽查）。
- 答错任意阶段回到 0，当天到期；答对推进一个阶段。
- 复习关优先抽取到期词、错误次数高的词；跨章时按章分组出题。
- 普通关目标词中最多约 30% 来自本章错词。

## 每日任务与统计

- 学习 10 个新词：20 金币。
- 复习 20 个错词：30 金币。
- 完成 1 局游戏：10 金币。
- 每日任务手动领取，每天一次，本地时间 0 点重置。
- 统计：累计学习、正确率、连续学习天数、通关、总星星、章节星星。
- 连续天数按完成一局计算，中断后从 1 重新开始。

## 排行榜

- 本周榜：按本周一的 `weekKey` 过滤，星星为本周成绩累计。
- 总榜：星星取 30 关最佳星级之和，避免重复刷同一关。
- 正确率按总正确 / 总作答加权。
- 排序：星星降序 → 正确率降序 → 连续天数降序 → 昵称。
- 预置 **8 位模拟好友**，周榜按 `weekKey + friend.id` 确定性生成，总榜静态；模拟数据不写入 IndexedDB。
- 只有普通关 / Boss 关写入排行榜；复习关与 PK 不计入。
- 接口位于 `src/services/leaderboard.ts` 的 `LeaderboardService`，后续接后端时替换 `recordRound` / `getLeaderboard` 实现即可。

## 好友 PK

- 固定第 6 章、12 题、5 分钟、3 心、五类均权。
- 6 位 Base32 对战码，字母表为 `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`。
- 30 bit 编码：seed 11 bit、正确数 5 bit、作答数 5 bit、用时 9 bit。
- 同一 seed 使用 `QuestionGenerator` 的种子随机，双方题目、选项顺序完全一致。
- 胜负：正确率更高者胜；相同则用时更短者胜；仍相同平局。
- 发起方完成对战后生成对战码；参与方输入同一码挑战。
- PK 计入每日“完成 1 局”、连续学习与金币；不计入关卡进度、排行榜、错词本与复习调度。
- 接口位于 `src/services/pk.ts` 的 `PKService`，后续可替换为服务端对战码校验。

## 本地存储

统一的 `AppStorage` 接口让业务层不直接依赖 IndexedDB API。

- 数据库名：`cet4-word-quest`，版本 1
- Object stores：
  - `settings`：设置
  - `progress`：玩家进度、金币、每日任务、关卡成绩
  - `wrongWords`：错词与复习阶段
  - `leaderboard`：普通关/Boss 关本地成绩
- 降级链：IndexedDB → localStorage → 内存
- 降级时页面顶部展示提示；内存模式下刷新会丢失进度

## 当前阶段边界

已完成：

- 300 词示例库、五类题型、章节权重、发音与降级
- 倒计时、3 心、连击、金币、结算与结果持久化
- 错词本、0/1/3/7/30 复习调度、复习关
- 每日任务、连续学习、学习统计
- 本地排行榜、8 位模拟好友
- 6 位 Base32 对战码、同题 PK、胜负结算
- 答对/答错/通关音效、静音开关与设置页试听
- 地图真实解锁、最佳星级与继续闯关
- 全局渲染异常兜底、存储降级提示、移动端键盘适配
- Vercel / Netlify / GitHub Pages 部署配置

后续阶段：

- 真实后端、跨设备排行榜与好友系统
- 中场刷新恢复（当前刷新会重新开局；结算结果可恢复）
- 更多音效音量/主题设置（当前仅静音）

## 静态部署

项目构建产物为纯静态站点，可部署到 Vercel、Netlify 或 GitHub Pages。由于使用 `BrowserRouter`，必须配置 History API fallback，否则 `/play/c1-l1` 等深链接刷新会 404。

### Vercel

仓库根目录已提供 `vercel.json`：

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

导入仓库后直接部署；静态资源优先于 rewrite，`/assets/*` 不受影响。

### Netlify

仓库根目录已提供 `netlify.toml`：

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

连接仓库后无需手动填写构建命令。

### GitHub Pages

已提供 `.github/workflows/deploy.yml`：

- `main` 分支推送或手动触发。
- `npm ci` → `npm run build` → 上传 `dist` → `actions/deploy-pages`。
- 需要在仓库 Settings → Pages 中选择 **GitHub Actions** 作为来源。

子路径通过 `VITE_BASE` 控制：

- 项目页 `https://<user>.github.io/<repo>/`：默认工作流会使用 `/<repo>/`。
- 用户/组织主页 `https://<user>.github.io/`：在仓库 Variables 中设置 `VITE_BASE=/`。
- 本地验证子路径：

```bash
VITE_BASE=/cet4-word-quest/ npm run build
```

`scripts/postbuild.mjs` 会在构建后把 `dist/index.html` 复制为 `dist/404.html`，GitHub Pages 的深链接会回退到 SPA。`public/.nojekyll` 用于跳过 Jekyll 处理。

### 构建产物说明

```bash
npm run build
```

依次执行：

1. `prebuild`：词库全量校验；
2. `tsc --noEmit && vite build`；
3. `postbuild`：生成 `dist/404.html`。

`dist/` 可直接部署到任意静态托管；若托管平台不支持 rewrite，可改用 `HashRouter`。

## 版本兼容策略

当前基线为 React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 4 + React Router 7 + Zustand 5。

如果该组合在目标机器上使用标准 `npm install` 后仍无法构建，且错误可归因于版本栈，将整体降级为：

- React 18.3
- Vite 5
- TypeScript 5.6
- React Router 6
- Zustand 4
- Tailwind CSS 3.4（改用 `tailwind.config.js` + PostCSS / Autoprefixer）

降级会同步调整配置与依赖，不混搭版本。

## 后续阶段

1. 阶段 1：CET-4 示例词库（300 词，6 章）+ 词库加载服务 + 替换说明（已通过）
2. 阶段 2：判题、计分、计时、生命值、连击、结算与最小单测（已通过）
3. 阶段 3：听音辨词、例句填空、听写、章节权重、发音与降级（已通过）
4. 阶段 4：错词本、0/1/3/7 复习、每日任务、学习统计（已通过）
5. 阶段 5：本地排行榜、好友 PK、Service 接口预留（已通过）
6. 阶段 6：音效、地图星级/锁定、异常与移动端收尾、部署配置（已通过）

## 完整词库替换说明

完整字段规范、数据来源与替换步骤见 [src/data/cet4/README.md](src/data/cet4/README.md)。核心约定：

- 示例库：6 章 × 50 词，共 300 词
- 完整库目标：每章 700—800 词
- `id`：`cet4_0001` 顺序编号；替换时保留已有词 ID，新词追加
- `difficulty` 严格等于 `chapter`
- `meta.json` 必须同步更新 `version`、`isSample`、`totalWords`、`chapters`、`source`、`updatedAt`
- 替换后必须运行 `npm run vocab:validate`，通过后再运行 `npm run typecheck` 与 `npm run build`
- 不要重排已有 ID，否则错词本和进度记录会指向错误单词
