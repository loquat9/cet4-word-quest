# 项目状态交接文档

## 1. 项目概览

- 项目：**四级词闯关**，面向 CET-4 考生的移动端 H5 单词记忆游戏。
- 路径：`D:\1\Desktop\dsh1`
- 核心节奏：5 分钟一局；章节闯关；五类题型混合。
- 当前阶段：**阶段 0—6 全部验收通过，项目正式收官。**
- 无后端、无数据库、无外部 API；排行榜与 PK 全部本地模拟，接口层已预留。
- 主要文档：`README.md`、`STAGE0_ACCEPTANCE.md`、`STAGE1_ACCEPTANCE.md`、`STAGE2_ACCEPTANCE.md`、`STAGE3_ACCEPTANCE.md`、`STAGE5_ACCEPTANCE.md`、`STAGE6_ACCEPTANCE.md`、`src/data/cet4/README.md`。

## 2. 技术栈与版本

| 依赖 | 版本 |
|---|---|
| React / React DOM | 19.3.1 |
| React Router DOM | 7.18.4 |
| Zustand | 5.0.16 |
| idb | 8.0.4 |
| Vite | 7.3.7 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.3.3（`@tailwindcss/vite`，CSS-first 主题） |
| @vitejs/plugin-react | 5.2.0 |
| Vitest | 5.0.5 |
| @types/react / @types/react-dom | 19.3.0 |

- Node.js 要求：`>=20.19.0`
- 本地验收环境：Node `v24.22.1`，npm `11.19.1`
- 项目版本：`0.1.0`
- 包管理：npm；`package-lock.json` 已生成
- `package.json` 中保留 `allowScripts.esbuild`，普通终端标准安装即可

## 3. 已完成阶段

### 阶段 0：项目初始化（已验收）

- Vite + React + TypeScript + Tailwind 4 + React Router 7
- 8 个正式路由 + 404
- 极简学习风主题：白底、靛蓝 `#4F46E5`、16px 卡片圆角、弱阴影、绿/红反馈
- 统一 `AppStorage` 存储接口；IndexedDB → localStorage → 内存降级
- 设置持久化、启动水合、存储降级提示

### 阶段 1：词库与数据层（已验收）

- 6 章 × 50 词 = **300 词 CET-4 示例库**
- 每章独立 JSON，按章懒加载
- `meta.json` + `chapterConfig.loadedCount`
- `scripts/validate-vocabulary.mjs` 严格校验；`prebuild` 阻断错误构建
- 设置页词库自检

### 阶段 2：答题核心闭环（已验收）

- 看词选义、看义选词；`judgeAnswer`、种子随机、`gameStore` 状态机
- 倒计时、3 心、连击、金币、反馈、结算
- 结算写入 `lastResult`，刷新可恢复
- 错词写入 IndexedDB；星级解锁下一关

### 阶段 3：五类题型与发音（已验收）

- 听音辨词、例句填空、听写拼写接入
- 章节题型权重 + `questionMix` 配额与分散
- Web Speech 发音：`en-US`、0.9 语速、自动播放、重播、防重叠、超时兜底、iOS 手势解锁
- 发音不可用时听音题降级为中文释义
- 听写输入：回车提交、忽略大小写/首尾空格、IME 防误触
- 首字母提示：5 / 8 金币，每题一次，立即扣款

### 阶段 4：错词本、复习、每日任务与统计（已验收）

- 错词本：统计、排序、发音、开始复习、复习阶段点
- 间隔重复：阶段 0/1/2/3/4，间隔 0/1/3/7/30 天；答错重置，答对推进
- 复习关：目标 12 题、不足 10 个错词时同章补足；跨章按章分组出题
- 普通关目标词中最多 30% 来自本章错词
- 每日任务：新词 10（20 金币）、复习错词 20（30 金币）、完成 1 局（10 金币）；手动领取、跨天重置
- 学习统计：累计学习、正确率、连续天数、通关、总星星、章节星星
- 首页任务面板、错词角标、统计网格；设置页统计卡片

### 阶段 5：排行榜与好友 PK（已验收）

- `LeaderboardService` 接口 + `LocalLeaderboardService`
- 本周榜 / 总榜：周一为周起点；总榜最佳星级、周榜本周累计
- 排序：星星 → 正确率 → 连续天数 → 昵称
- 8 位模拟好友：周榜按 `weekKey + friend.id` 确定性生成，总榜静态，不落库
- 只有 normal / boss 写入排行榜；review / pk 不写入
- `PKService` + 6 位 Base32 对战码（30 bit）
- 固定第 6 章 12 题 PK 关，同 seed 同题同序
- 发起方生成码、参与方输入码、正确率优先/用时其次/平局
- PK 计入每日任务、连续天数、金币；不计入关卡进度、排行榜、错词本/复习
- PK 结算页支持分享码与双方成绩对比
- 阶段 5 完成时纯逻辑测试 11 文件 / 130 用例；当前累计 12 文件 / 143 用例

### 阶段 6：音效、地图、异常与部署（已验收）

- Web Audio 合成答对/答错/通关三种轻提示音，无外部音频文件
- `useGameSounds` 监听反馈与通关；设置页三种试听、静音开关、支持状态
- 首次用户手势 `primeSound()` 解锁 iOS 音频
- 地图 `LevelNode`：真实锁定、最佳星级、Boss 样式
- 地图总览：总星星、已解锁、已通关、继续闯关
- `mapProgress` 纯逻辑：解锁、星级、章节/总体统计、下一关
- `AppErrorBoundary` 全局渲染异常兜底
- StorageNotice 降级文案与重新检测；BootScreen 初始化失败重试
- DictationInput：`visualViewport` 监听、聚焦滚动、提交 blur
- ResultStars 星星错峰淡入
- 部署：`vercel.json`、`netlify.toml`、GitHub Actions、`scripts/postbuild.mjs`
- `VITE_BASE` 支持 GitHub Pages 子路径；构建后生成 `dist/404.html`
- 纯逻辑测试 12 文件 / 143 用例通过；`typecheck`、`build` 与浏览器实测全部通过
- 部署配置已就绪；远程平台实际发布需账号授权，未在本地验收中执行

## 4. 目录结构

- `src/components/`
  - `AppErrorBoundary.tsx`：全局渲染异常兜底
  - `home/`：DailyTaskPanel、StatsGrid
  - `game/`：GameTopBar、QuestionCard、OptionGrid、AudioButton、DictationInput、AnswerFeedback、SpeechFallbackNotice
  - `leaderboard/`：LeaderboardRow
  - `map/`：LevelNode
  - `pk/`：PkCodeDisplay、PkResultPanel
  - `wrongbook/`：WrongWordItem
- `src/pages/`：首页、地图、答题、结算、错词本、排行榜、PK、设置、404
- `src/game/`：规则、判题、题目生成、题型配额、计分、复习调度、每日任务、学习统计、排行榜、地图状态纯逻辑、单测
- `src/store/`：`settingsStore`、`playerStore`、`gameStore`
- `src/services/`：存储、词库、错词/复习、发音、音效、排行榜、PK
- `src/services/speech/`：发音服务、音色选择
- `src/services/sound/`：Web Audio 音效合成
- `src/services/storage/`：IndexedDB/localStorage/内存实现
- `src/data/`：章节/关卡配置、题型权重、每日任务、模拟好友、CET-4 词库
- `src/hooks/`：启动水合、倒计时、发音、游戏音效、错词概览
- `src/utils/`：随机、格式化、日期/周 key、例句挖空、首字母提示
- `src/types/`：领域类型
- `scripts/`：词库校验、构建后 404 回退
- `.github/workflows/`：GitHub Pages 部署
- 根目录：`vercel.json`、`netlify.toml`

## 5. 关键约定

- **词库**：300 词，6 章 × 50 词；不编造单词；每章严格 50 词。
- **ID**：`cet4_0001`—`cet4_0300`；替换完整词库时保留已有 ID，只追加新 ID，禁止重排。
- **难度**：`difficulty` 严格等于 `chapter`。
- **例句**：目标词原形以整词形式恰好出现一次；大小写不敏感。
- **词库懒加载**：首页不加载章节 JSON；复习关/PK 仅在使用时加载所需章节。
- **prebuild**：严格校验；任何错误阻断构建。
- **普通关**：12/13/14/15 题，5 分钟。
- **Boss 关**：16 题；第 6 章最终 Boss 18 题，4 分钟。
- **复习关**：目标 12 题、不足 10 个错词时同章补足；5 分钟、3 心、提示 5 金币。
- **PK 关**：固定第 6 章 12 题、5 分钟、3 心、五类均权、提示 5 金币。
- **生命值**：3；答错扣 1 心；2 秒后继续；答对 600ms 自动继续。
- **星级**：正确率 ≥90% / ≥75% / ≥60% 分别为 3 / 2 / 1 星。
- **题型权重**：
  - 第 1 章：看词选义 50%、看义选词 50%
  - 第 2 章：看词选义 35%、看义选词 35%、听音辨词 30%
  - 第 3 章：例句填空 75%、看义选词 25%
  - 第 4 章：听音辨词 55%、听写 45%
  - 第 5 章：听写 70%、听音辨词 30%
  - 第 6 章：五类各 20%
- **错词调度**：stage 0/1/2/3/4，间隔 0/1/3/7/30 天；答错归零当天到期。
- **普通关错词占比**：当前章节错词最多约 30%。
- **每日任务**：新词 10 / 复习 20 / 完成 1 局；奖励 20/30/10；手动领取，本地 0 点重置。
- **排行榜**：只有 normal/boss；周榜本周累计，总榜最佳星级；本地玩家名“我”。
- **模拟好友**：8 位，周榜确定性生成，总榜静态，不写 IndexedDB。
- **PK 码**：6 位 Base32，字母表 `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`；30 bit：seed 11、正确 5、作答 5、用时 9。
- **PK 胜负**：正确率优先，用时其次，相同平局。
- **PK 隔离**：不写关卡进度、排行榜、错词本/复习；计入每日、连续天数、金币。
- **地图**：`unlockedLevelIds` 控制锁定；`levelProgress[level].stars` 控制星级；至少 1 星解锁下一关。
- **音效**：Web Audio 合成答对/答错/通关；设置可静音；不支持时静默降级；首次手势解锁。
- **发音**：Web Speech API，`en-US`，0.9；每次播放前取消上一个；不可用时降级。
- **UI**：移动端 375—430px，桌面最大 480px；无横向滚动。
- **测试范围**：纯逻辑；不测 UI、存储、排行榜服务、PK 页面。
- **构建**：`prebuild` 词库校验 → `tsc && vite build` → `postbuild` 生成 `dist/404.html`。
- **部署**：`VITE_BASE` 控制子路径；Vercel/Netlify rewrite；GitHub Pages 使用 404.html 回退。
- **无后端**：`LeaderboardService` / `PKService` 为替换点；README 说明后续接 HTTP。

## 6. 核心数据模型

- **Word**：id、word、phonetic、meaning、pos、example、exampleTranslation、chapter、difficulty、audioUrl。
- **Question**：id、type、wordId、chapter、difficulty、word、phonetic、meaning、audioText、prompt、options、correctAnswer、correctIndex、example、exampleTranslation、hint、answerLength。
- **LevelConfig**：id、chapter、index、title、kind（normal/boss/review/pk）、questionCount、timeLimitSec、hearts、questionTypes、hintCostCoins、unlockAfterLevelId。
- **ChapterConfig**：id、title、subtitle、targetCapacity、loadedCount、focusQuestionTypes、questionTypeWeights、bossLevelIndex。
- **PlayerProgress**：id、coins、unlockedLevelIds、levelProgress、learnedWordIds、totalAnswered、totalCorrect、streakDays、lastStudyDate、dailyTask、lastResult、updatedAt。
- **DailyTaskProgress**：date、newWordsLearned、wrongWordsReviewed、gamesPlayed、reviewedWordIds、claimedTaskIds。
- **RoundResult**：levelId、chapter、kind、startedAt、endedAt、timeLimitSec、timeUsedSec、totalQuestions、answeredCount、correctCount、accuracy、stars、score、coins、maxCombo、learnedWordIds、learnedWords、wrongAnswers、endReason。
- **WrongWordRecord**：wordId、word、phonetic、meaning、chapter、wrongCount、lastWrongAt、nextReviewAt、reviewStage。
- **LeaderboardEntry**：id、playerId、playerName、levelId、stars、accuracy、durationSec、score、playedAt、weekKey、isMock、correctCount、answeredCount、streakDays。
- **LeaderboardRow**：playerId、playerName、stars、accuracy、streakDays、games、isMock、isLocal、rank。
- **Settings**：id、soundEnabled、speechEnabled、updatedAt。
- **PK 类型**：`PkResultSnapshot`、`PkChallenge`、`PkComparison`（`services/pk.ts`）。

## 7. 当前局状态机

- 状态：`idle → loading → playing → feedback → finished`；加载/生成失败为 `error`。
- 关键字段：level、questions、currentIndex、answers、hearts、combo、maxCombo、score、coins、startedAt、questionStartedAt、deadline、feedback、result、error、hintUsedQuestionIds、hintPending。
- 开局：
  - 普通关：按章加载词库 → 30% 本章错词目标 → 生成。
  - 复习关：读取错词 → 到期优先 → 不足补足 → 按章分组生成。
  - PK：校验 seed → 加载第 6 章 → 种子出题，不使用错词加权。
- 答对：加分/金币/连击；答错：扣心/连击清零。
- feedback 自动或手动继续；心为 0、题目耗尽、时间到进入结算。
- 结算：
  - PK：跳过复习调度；仍更新金币、每日任务、连续天数、lastResult。
  - 普通/复习：先 `applyRoundOutcome` 更新错词调度，再 `completeRound` 统一保存进度/每日任务/连续天数。
  - 只有 normal/boss 在结算后写排行榜。

## 8. 当前数据与持久化

- 300 词全部通过全量校验；6 个章节 JSON。
- `PlayerProgress.lastResult` 用于刷新结算页恢复（含 PK）。
- 错词记录含 `reviewStage` 与 `nextReviewAt`；复习关与普通关都会更新。
- 每日任务 `reviewedWordIds` 去重；跨天重置；领取金币写 `progress`。
- `leaderboard` store 仅保存 normal/boss 记录；模拟好友不落库。
- 提示金币通过 `playerStore.spendCoins` 立即写入。
- 设置项：音效、发音；刷新后从 IndexedDB 恢复。
- 地图状态完全由 `unlockedLevelIds` 与 `levelProgress` 派生，无额外存储。
- 阶段 5 已通过 `typecheck` / `test` / `build` 与浏览器双开测试。
- 阶段 6 已通过 `typecheck` / `test` / `build` 与浏览器实测；`dist/404.html` 已生成。
- 远程 Vercel / Netlify / GitHub Pages 实际发布未执行，仅完成配置校验。

## 9. 已知限制与风险

- 远程 Vercel / Netlify / GitHub Pages 实际发布未执行，仅完成配置校验。
- 排行榜模拟好友为本地数据，不是真实用户。
- 对战码无服务端签名，理论上可被手动构造；本地娱乐用途可接受。
- 对战码 30 bit：seed 2048 种、用时上限 300 秒；超出范围会拒绝编码。
- PK 结果页依赖 query（mode/seed/code）+ `lastResult`；直接访问缺参数会提示错误。
- 无后端、跨设备同步、真实好友关系。
- 音效为固定音量合成音，无音量滑杆与更多音色。
- 中场刷新会重新开局；结算结果可恢复。
- 发音依赖系统英语音色；iOS 解锁建议真机回归。
- 300 词示例库，完整词库替换见说明。

## 10. 最终验收与交付

项目已通过最终验收：

- `npm run typecheck`：通过。
- `npm run test`：12 个测试文件 / 143 个用例通过。
- `npm run build`：成功；`prebuild` 词库校验、`postbuild` 404 回退均正常。
- 浏览器实测：音效/静音/试听、地图锁定与星级、听写键盘防遮挡、异常提示均正常。
- `dist/index.html`、`dist/404.html` 与 6 个章节 chunk 已生成。
- Vercel / Netlify / GitHub Pages 配置文件已就绪；远程发布待账号授权。

后续可选项：

- 玩家昵称设置（排行榜当前固定“我”）。
- 音量滑杆、更多轻音效。
- 真实后端、跨设备排行榜、好友系统。
- 中场刷新恢复。
- 更完整的无障碍与真机兼容性回归。
