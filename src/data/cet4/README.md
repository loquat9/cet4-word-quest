# CET-4 词库数据说明

## 当前状态

阶段 1 批次 4 完成：6 章 × 50 词，共 300 词全部接入。

- 总词数：300 词，6 章 × 50 词
- 每章严格 50 词
- `difficulty` 与 `chapter` 一一对应（第 1 章为 1，第 6 章为 6）
- 每章 JSON 独立存放，由 `src/services/vocabulary/index.ts` 动态加载
- 全量校验：6 章 / 300 词 / 0 errors

## 数据来源与核验

- 候选词表：公开 CET-4 词表
  [genkin-he/english-vocabulary](https://github.com/genkin-he/english-vocabulary)
  中的 `3 四级-乱序.txt`，获取日期 2026-10-26。
- 所有写入的单词均在该 CET-4 词表中按整词匹配核验，不使用虚构单词。
- 音标、词性、中文释义按常用词典释义整理；批次 1 另用
  [dictionaryapi.dev](https://dictionaryapi.dev/)（数据来源 Wiktionary，CC BY-SA 3.0）
  抽查了 abandon、access、aware、beyond、benefit 5 个词；批次 2 抽查了
  average、environment、ambitious、communicate、experience 5 个词；批次 3 抽查了
  advertisement、appeal、accommodation、approximately、characteristic 5 个词；
  批次 4 抽查了 abstract、abundant、accelerate、consensus、constitute 5 个词。
- 英文例句与中文翻译为本项目自行编写，未直接复制来源词库中的例句。
- 例句中的目标词使用原形，并以整词形式恰好出现一次；校验对大小写不敏感，
  因此句首大写的目标词也可被正确识别和后续挖空。

## 字段规范

每个词条严格包含以下 10 个字段，不允许多余字段：

```json
{
  "id": "cet4_0001",
  "word": "abandon",
  "phonetic": "/əˈbændən/",
  "meaning": "v. 放弃；抛弃",
  "pos": "v.",
  "example": "Abandon the old plan and start again.",
  "exampleTranslation": "放弃旧计划，重新开始。",
  "chapter": 1,
  "difficulty": 1,
  "audioUrl": ""
}
```

约定：

- `id`：`cet4_0001`—`cet4_0300`。替换完整词库时，已有单词保留原 ID，
  新词从 `cet4_0301` 起追加，禁止重新编号。
- `word`：小写英文字母单词。
- `phonetic`：`/.../` 格式的 IPA。
- `pos`：`n.`、`v.`、`adj.`、`adv.`、`prep.`、`conj.`、`pron.`、`num.`、
  `art.`、`aux.`、`int.`、`phr.`；多词性用 `/` 连接。
- `meaning`：中文释义，主词性开头，多个义项用 `；` 分隔。
- `example`：原创英文例句，目标词原形恰好出现一次（大小写不敏感）。
- `exampleTranslation`：例句中文翻译。
- `chapter`：1—6，与文件编号一致。
- `difficulty`：严格等于 `chapter`。
- `audioUrl`：阶段 1 固定为空字符串；发音由 Web Speech API 使用 `word` 朗读。

## 校验

```bash
npm run vocab:validate
npm run vocab:validate -- --chapter 1
```

- 全量模式检查 6 章、meta 词数、字段、唯一性、例句挖空条件等。
- 单章模式仅用于分批开发，不用于构建。
- `prebuild` 会自动运行全量校验；任何错误都会阻断 `npm run build`。

## 完整词库替换

按以下步骤把 300 词示例库替换为完整 CET-4 词库（目标每章 700—800 词）：

1. 准备 `chapter-1.json`—`chapter-6.json`，每章为单词对象数组；
2. 保持每个词条严格 10 个字段，音标、释义、例句、翻译完整；
3. 保留示例库中已有单词的 `id`，新词从 `cet4_0301` 起追加，禁止重新编号；
4. 更新 `meta.json`：
   - `version` 改为新版本号；
   - `isSample` 改为 `false`；
   - `source` 记录完整词库来源；
   - `updatedAt` 更新日期；
   - `chapters` 与 `totalWords` 改为实际词数；
5. 每章建议 700—800 词，且 `difficulty` 仍严格等于 `chapter`；
6. 运行 `npm run vocab:validate`；
7. 通过后运行 `npm run typecheck` 与 `npm run build`；
8. 打开设置页点击“检查词库”，确认显示 6 章 / 总词数，且无错误。

> 替换完整词库时不要重排已有 ID，否则错词本和进度记录会指向错误单词。
> 若必须整体重编号，需要同时迁移或清空本地进度与错词数据。
