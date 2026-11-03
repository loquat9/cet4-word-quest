import type { ChapterId, Word } from '../../types';
import { countHeadwordOccurrences } from '../../utils/headword';

export const WORD_FIELDS = [
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
] as const;

export const POS_VALUES = [
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
] as const;

const POS_SET = new Set<string>(POS_VALUES);
const WORD_ID_PATTERN = /^cet4_\d{4}$/;
const WORD_PATTERN = /^[a-z]+$/;
const PHONETIC_PATTERN = /^\/.+\/$/;
const CJK_PATTERN = /[\u3400-\u9fff]/;

export class VocabularyValidationError extends Error {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[]) {
    super(message);
    this.name = 'VocabularyValidationError';
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidPos(value: string): boolean {
  return value.split('/').every((part) => POS_SET.has(part));
}

/**
 * 运行时防御性校验。完整业务校验由构建前的 validate-vocabulary.mjs 负责。
 */
export function assertChapterWords(
  raw: unknown,
  chapter: ChapterId,
): Word[] {
  const issues: string[] = [];
  const words: Word[] = [];

  if (!Array.isArray(raw)) {
    throw new VocabularyValidationError(`第 ${chapter} 章词库不是数组`, [
      'expected an array',
    ]);
  }

  if (raw.length === 0) {
    throw new VocabularyValidationError(`第 ${chapter} 章词库为空`, [
      'chapter must contain at least one word',
    ]);
  }

  const seenIds = new Set<string>();
  const seenWords = new Set<string>();
  const seenMeanings = new Set<string>();

  raw.forEach((item, index) => {
    const prefix = `word[${index}]`;
    const issueStart = issues.length;

    if (!isRecord(item)) {
      issues.push(`${prefix}: 必须是对象`);
      return;
    }

    const keys = Object.keys(item).sort();
    const expectedKeys = [...WORD_FIELDS].sort();

    if (
      keys.length !== expectedKeys.length ||
      keys.some((key, keyIndex) => key !== expectedKeys[keyIndex])
    ) {
      issues.push(
        `${prefix}: 字段必须严格为 ${WORD_FIELDS.join(', ')}`,
      );
      return;
    }

    const id = item.id;
    const word = item.word;
    const phonetic = item.phonetic;
    const meaning = item.meaning;
    const pos = item.pos;
    const example = item.example;
    const exampleTranslation = item.exampleTranslation;
    const rawChapter = item.chapter;
    const rawDifficulty = item.difficulty;
    const audioUrl = item.audioUrl;

    if (typeof id !== 'string' || !WORD_ID_PATTERN.test(id)) {
      issues.push(`${prefix}: id 必须符合 cet4_0000 格式`);
    } else if (seenIds.has(id)) {
      issues.push(`${prefix}: id 重复（${id}）`);
    } else {
      seenIds.add(id);
    }

    if (typeof word !== 'string' || !WORD_PATTERN.test(word)) {
      issues.push(`${prefix}: word 必须是小写字母单词`);
    } else if (seenWords.has(word)) {
      issues.push(`${prefix}: word 重复（${word}）`);
    } else {
      seenWords.add(word);
    }

    if (
      typeof phonetic !== 'string' ||
      !PHONETIC_PATTERN.test(phonetic)
    ) {
      issues.push(`${prefix}: phonetic 必须使用 /.../ 格式`);
    }

    if (
      typeof meaning !== 'string' ||
      meaning.trim().length === 0 ||
      !CJK_PATTERN.test(meaning)
    ) {
      issues.push(`${prefix}: meaning 必须包含中文释义`);
    } else {
      const meaningKey = meaning.trim().toLowerCase();
      if (seenMeanings.has(meaningKey)) {
        issues.push(`${prefix}: meaning 与本章其他词完全重复`);
      } else {
        seenMeanings.add(meaningKey);
      }
    }

    if (typeof pos !== 'string' || !isValidPos(pos)) {
      issues.push(`${prefix}: pos 不在允许的词性集合内`);
    }

    if (
      typeof example !== 'string' ||
      example.trim().length === 0
    ) {
      issues.push(`${prefix}: example 不能为空`);
    } else if (
      typeof word === 'string' &&
      countHeadwordOccurrences(example, word) !== 1
    ) {
      issues.push(
        `${prefix}: example 必须以整词形式恰好包含一次 "${String(word)}"（大小写不敏感）`,
      );
    }

    if (
      typeof exampleTranslation !== 'string' ||
      exampleTranslation.trim().length === 0 ||
      !CJK_PATTERN.test(exampleTranslation)
    ) {
      issues.push(`${prefix}: exampleTranslation 必须包含中文翻译`);
    }

    if (
      typeof rawChapter !== 'number' ||
      rawChapter !== chapter
    ) {
      issues.push(`${prefix}: chapter 必须等于 ${chapter}`);
    }

    if (
      typeof rawDifficulty !== 'number' ||
      rawDifficulty !== chapter
    ) {
      issues.push(`${prefix}: difficulty 必须等于 chapter（${chapter}）`);
    }

    if (typeof audioUrl !== 'string') {
      issues.push(`${prefix}: audioUrl 必须是字符串`);
    }

    if (issues.length === issueStart) {
      words.push(item as unknown as Word);
    }
  });

  if (issues.length > 0) {
    throw new VocabularyValidationError(
      `第 ${chapter} 章词库校验失败`,
      issues,
    );
  }

  return words;
}
