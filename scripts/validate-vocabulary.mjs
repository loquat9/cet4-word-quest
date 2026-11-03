#!/usr/bin/env node
/**
 * CET-4 词库严格校验脚本。
 *
 * 用法：
 *   node scripts/validate-vocabulary.mjs
 *   node scripts/validate-vocabulary.mjs --chapter 1
 *
 * 全量模式由 npm prebuild 自动调用；任何错误都会以退出码 1 阻断构建。
 * --chapter 仅用于分批开发时校验单章，不会绕过全量构建校验。
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const DATA_DIR = path.join(ROOT, 'src', 'data', 'cet4');
const META_PATH = path.join(DATA_DIR, 'meta.json');

const CHAPTER_IDS = [1, 2, 3, 4, 5, 6];
const WORD_FIELDS = [
  'id',
  'word',
  'phonetic',
  'meaning',
  'pos',
  'example',
  'exampleTranslation',
  'chapter',
  'difficulty',
  'audioUrl',
];
const WORD_FIELD_SET = [...WORD_FIELDS].sort();
const POS_VALUES = new Set([
  'n.',
  'v.',
  'adj.',
  'adv.',
  'prep.',
  'conj.',
  'pron.',
  'num.',
  'art.',
  'aux.',
  'int.',
  'phr.',
]);
const ID_PATTERN = /^cet4_\d{4}$/;
const WORD_PATTERN = /^[a-z]+$/;
const PHONETIC_PATTERN = /^\/.+\/$/;
const CJK_PATTERN = /[\u3400-\u9fff]/;

const errors = [];
const seenIds = new Set();
const seenWords = new Set();

function addError(message) {
  errors.push(message);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countHeadwordMatches(text, word) {
  const pattern = new RegExp(
    `(^|[^A-Za-z])(${escapeRegExp(word)})(?![A-Za-z])`,
    'gi',
  );
  return [...text.matchAll(pattern)].length;
}

function isValidPos(value) {
  return value.split('/').every((part) => POS_VALUES.has(part));
}

function readJson(filePath, label) {
  if (!existsSync(filePath)) {
    addError(`${label}: 文件不存在（${path.relative(ROOT, filePath)}）`);
    return null;
  }

  try {
    const raw = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch (error) {
    addError(
      `${label}: JSON 解析失败：${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let onlyChapter = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--chapter') {
      const rawValue = args[index + 1];
      const value = Number(rawValue);
      index += 1;

      if (!Number.isInteger(value) || value < 1 || value > 6) {
        addError(`--chapter 参数必须是 1—6 的整数，收到：${rawValue}`);
        return { onlyChapter: null };
      }

      onlyChapter = value;
      continue;
    }

    if (arg.startsWith('--chapter=')) {
      const rawValue = arg.slice('--chapter='.length);
      const value = Number(rawValue);

      if (!Number.isInteger(value) || value < 1 || value > 6) {
        addError(`--chapter 参数必须是 1—6 的整数，收到：${rawValue}`);
        return { onlyChapter: null };
      }

      onlyChapter = value;
      continue;
    }

    addError(`未知参数：${arg}`);
    return { onlyChapter: null };
  }

  return { onlyChapter };
}

function validateMeta(meta) {
  if (!isRecord(meta)) {
    addError('meta.json: 顶层必须是对象');
    return null;
  }

  if (typeof meta.version !== 'string' || meta.version.trim() === '') {
    addError('meta.json: version 必须是非空字符串');
  }
  if (typeof meta.isSample !== 'boolean') {
    addError('meta.json: isSample 必须是布尔值');
  }
  if (
    typeof meta.totalWords !== 'number' ||
    !Number.isInteger(meta.totalWords)
  ) {
    addError('meta.json: totalWords 必须是整数');
  }
  if (typeof meta.source !== 'string' || meta.source.trim() === '') {
    addError('meta.json: source 必须是非空字符串');
  }
  if (typeof meta.updatedAt !== 'string' || meta.updatedAt.trim() === '') {
    addError('meta.json: updatedAt 必须是非空字符串');
  }

  if (!isRecord(meta.chapters)) {
    addError('meta.json: chapters 必须是对象');
    return null;
  }

  const chapterKeys = Object.keys(meta.chapters).sort();
  const expectedKeys = CHAPTER_IDS.map(String).sort();

  if (
    chapterKeys.length !== expectedKeys.length ||
    chapterKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    addError('meta.json: chapters 必须且只能包含 "1"—"6" 六个键');
  }

  let total = 0;

  for (const chapter of CHAPTER_IDS) {
    const count = meta.chapters[String(chapter)];

    if (typeof count !== 'number' || !Number.isInteger(count)) {
      addError(`meta.json: chapters["${chapter}"] 必须是整数`);
      continue;
    }

    total += count;

    if (meta.isSample) {
      if (count !== 50) {
        addError(
          `meta.json: 示例库第 ${chapter} 章必须为 50 词，当前为 ${count}`,
        );
      }
    } else if (count < 700 || count > 800) {
      addError(
        `meta.json: 完整库第 ${chapter} 章必须为 700—800 词，当前为 ${count}`,
      );
    }
  }

  if (
    typeof meta.totalWords === 'number' &&
    meta.totalWords !== total
  ) {
    addError(
      `meta.json: totalWords=${meta.totalWords}，但章节词数合计为 ${total}`,
    );
  }

  if (meta.isSample && total !== 300) {
    addError(`meta.json: 示例库总词数必须为 300，当前为 ${total}`);
  }

  if (!meta.isSample && (total < 4200 || total > 4800)) {
    addError(
      `meta.json: 完整库总词数必须为 4200—4800，当前为 ${total}`,
    );
  }

  return meta;
}

function validateWord(word, index, chapter, chapterSeenMeanings, posSet) {
  const prefix = `chapter ${chapter} / word[${index}]`;

  if (!isRecord(word)) {
    addError(`${prefix}: 必须是对象`);
    return false;
  }

  const keys = Object.keys(word).sort();

  if (
    keys.length !== WORD_FIELD_SET.length ||
    keys.some((key, keyIndex) => key !== WORD_FIELD_SET[keyIndex])
  ) {
    addError(
      `${prefix}: 字段必须严格为 ${WORD_FIELDS.join(', ')}`,
    );
    return false;
  }

  const startErrorCount = errors.length;

  if (typeof word.id !== 'string' || !ID_PATTERN.test(word.id)) {
    addError(`${prefix}: id 必须符合 cet4_0000 格式`);
  } else if (seenIds.has(word.id)) {
    addError(`${prefix}: id 重复（${word.id}）`);
  } else {
    seenIds.add(word.id);
  }

  if (
    typeof word.word !== 'string' ||
    !WORD_PATTERN.test(word.word)
  ) {
    addError(`${prefix}: word 必须是小写字母单词`);
  } else if (seenWords.has(word.word)) {
    addError(`${prefix}: word 重复（${word.word}）`);
  } else {
    seenWords.add(word.word);
  }

  if (
    typeof word.phonetic !== 'string' ||
    !PHONETIC_PATTERN.test(word.phonetic)
  ) {
    addError(`${prefix}: phonetic 必须使用 /.../ 格式`);
  }

  if (typeof word.meaning !== 'string' || word.meaning.trim() === '') {
    addError(`${prefix}: meaning 不能为空`);
  } else {
    if (!CJK_PATTERN.test(word.meaning)) {
      addError(`${prefix}: meaning 必须包含中文释义`);
    }

    const meaningKey = word.meaning.trim().toLowerCase();

    if (chapterSeenMeanings.has(meaningKey)) {
      addError(`${prefix}: meaning 与本章其他词完全重复`);
    } else {
      chapterSeenMeanings.add(meaningKey);
    }
  }

  if (typeof word.pos !== 'string' || !isValidPos(word.pos)) {
    addError(`${prefix}: pos 不在允许的词性集合内`);
  } else {
    posSet.add(word.pos);
  }

  if (typeof word.example !== 'string' || word.example.trim() === '') {
    addError(`${prefix}: example 不能为空`);
  } else if (
    typeof word.word === 'string' &&
    countHeadwordMatches(word.example, word.word) !== 1
  ) {
    addError(
      `${prefix}: example 必须以整词形式恰好包含一次 "${word.word}"（大小写不敏感）`,
    );
  }

  if (
    typeof word.exampleTranslation !== 'string' ||
    word.exampleTranslation.trim() === ''
  ) {
    addError(`${prefix}: exampleTranslation 不能为空`);
  } else if (!CJK_PATTERN.test(word.exampleTranslation)) {
    addError(`${prefix}: exampleTranslation 必须包含中文翻译`);
  }

  if (word.chapter !== chapter) {
    addError(`${prefix}: chapter 必须等于 ${chapter}`);
  }

  if (word.difficulty !== chapter) {
    addError(`${prefix}: difficulty 必须等于 chapter（${chapter}）`);
  }

  if (typeof word.audioUrl !== 'string') {
    addError(`${prefix}: audioUrl 必须是字符串`);
  }

  return errors.length === startErrorCount;
}

function main() {
  const { onlyChapter } = parseArgs();
  const meta = validateMeta(readJson(META_PATH, 'meta.json'));

  if (!meta) {
    reportAndExit();
    return;
  }

  const chaptersToCheck = onlyChapter
    ? [onlyChapter]
    : CHAPTER_IDS;

  console.log('CET-4 vocabulary validation');
  console.log(
    `Mode: ${onlyChapter ? `partial (chapter ${onlyChapter})` : 'full'}`,
  );
  console.log('');

  let totalWords = 0;

  for (const chapter of chaptersToCheck) {
    const chapterErrorStart = errors.length;
    const expectedCount = meta.chapters[String(chapter)];
    const fileName = `chapter-${chapter}.json`;
    const payload = readJson(path.join(DATA_DIR, fileName), fileName);

    if (payload === null) {
      console.log(`[chapter ${chapter}] FAILED`);
      continue;
    }

    if (!Array.isArray(payload)) {
      addError(`chapter ${chapter}: 顶层必须是数组`);
      console.log(`[chapter ${chapter}] FAILED`);
      continue;
    }

    if (payload.length === 0) {
      addError(`chapter ${chapter}: 词库不能为空`);
    }

    if (payload.length !== expectedCount) {
      addError(
        `chapter ${chapter}: meta 声明 ${expectedCount} 词，实际 ${payload.length} 词`,
      );
    }

    if (meta.isSample && payload.length !== 50) {
      addError(
        `chapter ${chapter}: 示例库每章必须严格 50 词，当前 ${payload.length}`,
      );
    }

    if (
      !meta.isSample &&
      (payload.length < 700 || payload.length > 800)
    ) {
      addError(
        `chapter ${chapter}: 完整库每章必须为 700—800 词，当前 ${payload.length}`,
      );
    }

    const chapterSeenMeanings = new Set();
    const posSet = new Set();

    payload.forEach((word, index) => {
      validateWord(
        word,
        index,
        chapter,
        chapterSeenMeanings,
        posSet,
      );
    });

    if (posSet.size < 3) {
      addError(
        `chapter ${chapter}: 每章至少需要 3 种词性，当前 ${posSet.size} 种`,
      );
    }

    totalWords += payload.length;

    if (errors.length === chapterErrorStart) {
      console.log(
        `[chapter ${chapter}] ${payload.length} words OK · ${
          posSet.size
        } POS · unique IDs/words OK`,
      );
    } else {
      console.log(`[chapter ${chapter}] FAILED`);
    }
  }

  console.log('');

  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Result: ${chaptersToCheck.length} chapter(s) / ${totalWords} words / 0 errors`,
  );

  if (onlyChapter) {
    console.log(
      'Partial validation passed. Full prebuild validation still requires all six chapters.',
    );
  } else {
    console.log('All checks passed.');
  }
}

function reportAndExit() {
  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }
}

main();
