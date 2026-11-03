# 阶段 2 答题核心闭环验收清单

> 当前环境说明：Vitest 与 Vite 构建依赖 esbuild 子进程，当前 DSH 沙箱会阻断；单测、构建与浏览器流程需在普通终端完成。

## 1. 自动化检查

```powershell
npm run test
npm run typecheck
npm run build
```

预期：

- `npm run test`：3 个测试文件、21 个用例全部通过
- `npm run typecheck`：退出码 0，无输出
- `npm run build`：
  - `prebuild` 词库校验显示 `6 chapter(s) / 300 words / 0 errors`
  - Vite 构建成功
  - `dist/assets/` 下生成 6 个章节 chunk

## 2. 启动开发服务器

```powershell
npm run dev
```

打开 `http://localhost:5173/`。

## 3. 基础答题流程

1. 首页点击“开始闯关”进入 `/map`
2. 点击第 1 章第 1 关 `/play/c1-l1`
3. 确认：
   - 题量为 12 题
   - 倒计时从 5:00 开始
   - 初始生命值 3 颗心
   - 连击从 ×0 开始
4. 点击一个正确选项：
   - 选项变绿
   - 显示“回答正确”
   - 连击 +1
   - 金币增加
   - 约 600ms 后自动进入下一题
5. 点击一个错误选项：
   - 选项变红，正确选项变绿
   - 生命值 -1
   - 显示正确答案、音标、例句和翻译
   - 约 2 秒后自动继续；也可点“继续”立即继续
   - 连击归零
6. 连续答对 3 / 5 / 10 题，确认额外金币奖励出现。

## 4. 三种结束方式

分别验证：

1. **全部答完**：完成最后一题反馈后进入结算。
2. **时间到**：可临时将系统时间或使用 DevTools 修改 deadline；或等待 5 分钟，确认进入结算且 `结束原因：时间到`。
3. **生命归零**：连续答错 3 题，显示第三次错误反馈后进入结算，`结束原因：生命值耗尽`。

## 5. 结算页

确认显示：

- 星级（0—3 星）
- 正确率
- 用时
- 答对 / 作答
- 金币
- 最大连击
- 得分
- 新学单词列表
- 本局错词列表（单词、音标、释义、正确答案、你的选择）

星级边界可分别验证：

- 90% 及以上 → 3 星
- 75%—89% → 2 星
- 60%—74% → 1 星
- 低于 60% → 0 星

## 6. 刷新持久化

1. 在结算页按 F5 刷新
2. 确认成绩仍显示，不回到空状态
3. 打开 DevTools → Application → IndexedDB → `cet4-word-quest` → `progress`
4. 确认存在 `lastResult` 与对应 `levelProgress`
5. 确认 `wrongWords` 中存在本局错词，`wrongCount` 已增加

## 7. 关卡与解锁

1. 以至少 1 星完成 `c1-l1`
2. 结算页应出现“下一关”（`c1-l2`）
3. 点击“下一关”能正常开始新一局
4. 点击“再来一次”能重新开始当前关
5. 验证 Boss 关：
   - `c1-l5`：16 题、4:00
   - `c6-l5`：18 题、4:00

> 地图锁定与星级展示仍为后续阶段，本阶段只验证解锁数据写入进度。

## 8. 移动端

DevTools 分别使用：

- 375 × 812
- 430 × 932

检查：

- 无横向滚动
- 选项按钮高度不小于 44px，可点击
- 倒计时、生命值、连击不换行溢出
- 结算页文字和错词列表不溢出卡片

控制台执行：

```js
({
  innerWidth: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
});
```

预期：`horizontalOverflow: false`。

## 9. 倒计时清理

1. 进入答题页后立即点击“退出”
2. 返回地图，再进入另一关
3. 确认旧倒计时不会继续影响新关卡
4. 控制台无相关计时器/内存泄漏报错

## 10. 本阶段不验收

- 听音辨词
- 例句填空
- 听写拼写
- 发音播放
- 错词本页面
- 0/1/3/7 天完整复习调度
- 每日任务、排行榜、好友 PK

## 11. 请贴回

1. `npm run test` 完整输出
2. `npm run typecheck` 输出
3. `npm run build` 完整输出与章节 chunk 列表
4. 基础答题、错误反馈、结算页截图或文字结果
5. 刷新后 `lastResult` / `wrongWords` 的 DevTools 截图或文字
6. 375px / 430px 的 `horizontalOverflow` 结果
7. 浏览器控制台是否有项目相关报错
