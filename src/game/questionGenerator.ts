import type {
  Question,
  QuestionType,
  Word,
} from '../types';
import {
  createSeededRandom,
  shuffle,
  type RandomSource,
} from '../utils/random';
import { blankHeadword } from '../utils/headword';
import { buildLetterHint, getAnswerLength } from '../utils/hint';
import { buildQuestionTypeSequence } from './questionMix';

/**
 * 阶段 2 的基础题型常量保留导出，供旧调用方平滑迁移；
 * 阶段 3 起统一使用 ALL_QUESTION_TYPES / QuestionType。
 */
export type BasicQuestionType = Extract<
  QuestionType,
  'word-to-meaning' | 'meaning-to-word'
>;

export const BASIC_QUESTION_TYPES: readonly BasicQuestionType[] = [
  'word-to-meaning',
  'meaning-to-word',
];

export const ALL_QUESTION_TYPES: readonly QuestionType[] = [
  'word-to-meaning',
  'meaning-to-word',
  'listen-to-word',
  'example-fill',
  'dictation',
];

const OPTION_COUNT = 4;

export class QuestionGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionGenerationError';
  }
}

export interface GenerateQuestionsOptions {
  /** 同一章节词池 */
  words: readonly Word[];
  /** 目标题量 */
  count: number;
  /** 可用题型，默认五类全开 */
  types?: readonly QuestionType[];
  /** 题型相对权重；未提供时在 types 内均匀分配 */
  weights?: Partial<Record<QuestionType, number>>;
  /**
   * 指定目标词，用于错词复习与错词加权。
   * 必须与 words 同章、id 不重复，数量等于 count。
   */
  targets?: readonly Word[];
  /** 种子，便于测试与后续 PK 同题对战 */
  seed?: number;
  /** 显式传入随机源时优先于 seed */
  random?: RandomSource;
  /** 题目 id 前缀，保证一局内唯一 */
  idPrefix?: string;
}

/** 选择题的答案取词义还是单词本身 */
function optionValue(word: Word, type: QuestionType): string {
  return type === 'word-to-meaning' ? word.meaning : word.word;
}

/** 生成题目主展示内容；不含答案 */
function buildPrompt(target: Word, type: QuestionType): string {
  switch (type) {
    case 'word-to-meaning':
      return target.word;
    case 'meaning-to-word':
    case 'dictation':
      return target.meaning;
    case 'listen-to-word':
      return '听发音，选出你听到的单词';
    case 'example-fill': {
      const prompt = blankHeadword(target.example, target.word);
      if (!target.example.trim() || prompt === target.example) {
        throw new QuestionGenerationError(
          `"${target.word}" 的例句未包含目标词，无法生成例句填空`,
        );
      }
      return prompt;
    }
  }
}

/**
 * 为选择题构造 4 个不重复选项。
 * 干扰项优先同词性；按展示值去重（词义题比较 meaning，选词题比较 word）。
 */
function buildChoiceOptions(
  target: Word,
  pool: readonly Word[],
  type: QuestionType,
  random: RandomSource,
): { options: string[]; correctAnswer: string; correctIndex: number } {
  const correctAnswer = optionValue(target, type);
  const usedOptions = new Set<string>([correctAnswer.trim()]);
  const candidates = pool.filter((word) => word.id !== target.id);

  const samePos = shuffle(
    candidates.filter((word) => word.pos === target.pos),
    random,
  );
  const otherPos = shuffle(
    candidates.filter((word) => word.pos !== target.pos),
    random,
  );

  const options = [correctAnswer];

  for (const candidate of [...samePos, ...otherPos]) {
    if (options.length >= OPTION_COUNT) break;

    const value = optionValue(candidate, type);
    const key = value.trim();

    if (!key || usedOptions.has(key)) continue;

    usedOptions.add(key);
    options.push(value);
  }

  if (options.length !== OPTION_COUNT) {
    throw new QuestionGenerationError(
      `第 ${target.chapter} 章词池不足，无法为 "${target.word}" 生成 4 个不重复选项`,
    );
  }

  const shuffledOptions = shuffle(options, random);
  const correctIndex = shuffledOptions.indexOf(correctAnswer);

  if (correctIndex < 0) {
    throw new QuestionGenerationError('正确选项在洗牌后丢失');
  }

  return {
    options: shuffledOptions,
    correctAnswer,
    correctIndex,
  };
}

function buildQuestion(
  target: Word,
  pool: readonly Word[],
  type: QuestionType,
  random: RandomSource,
  idPrefix: string,
  index: number,
): Question {
  const base = {
    id: `${idPrefix}-${index}-${target.id}`,
    type,
    wordId: target.id,
    chapter: target.chapter,
    difficulty: target.difficulty,
    word: target.word,
    phonetic: target.phonetic,
    meaning: target.meaning,
    audioText: target.word,
    prompt: buildPrompt(target, type),
    example: target.example,
    exampleTranslation: target.exampleTranslation,
  };

  if (type === 'dictation') {
    return {
      ...base,
      options: [],
      correctAnswer: target.word,
      correctIndex: null,
      hint: buildLetterHint(target.word),
      answerLength: getAnswerLength(target.word),
    };
  }

  const { options, correctAnswer, correctIndex } =
    buildChoiceOptions(target, pool, type, random);

  return {
    ...base,
    options,
    correctAnswer,
    correctIndex,
  };
}

/**
 * 从同一章节词池生成一组混合题型题目。
 *
 * 规则：
 * - 目标词不重复；
 * - 选择题每题 4 个不重复选项，听写题无选项；
 * - 干扰项优先同词性，来自同一章；
 * - 题型按权重分配，题量允许时每种题型至少 1 题；
 * - 首题优先基础题型热身，同题型尽量不连续。
 */
export function generateQuestions(
  options: GenerateQuestionsOptions,
): Question[] {
  const {
    words,
    count,
    seed,
    random: providedRandom,
    idPrefix = 'q',
  } = options;

  if (!Number.isInteger(count) || count <= 0) {
    throw new QuestionGenerationError(
      `count 必须是正整数，收到：${String(count)}`,
    );
  }

  if (words.length < OPTION_COUNT) {
    throw new QuestionGenerationError(
      `词池至少需要 ${OPTION_COUNT} 个词，当前 ${words.length} 个`,
    );
  }

  if (count > words.length) {
    throw new QuestionGenerationError(
      `目标题量 ${count} 超过词池容量 ${words.length}`,
    );
  }

  const chapter = words[0].chapter;

  if (words.some((word) => word.chapter !== chapter)) {
    throw new QuestionGenerationError('词池必须来自同一章节');
  }

  const types = options.types ?? ALL_QUESTION_TYPES;

  if (types.length === 0) {
    throw new QuestionGenerationError('至少需要一种题型');
  }

  if (types.some((type) => !ALL_QUESTION_TYPES.includes(type))) {
    throw new QuestionGenerationError('包含不支持的题型');
  }

  const random =
    providedRandom ??
    (seed === undefined ? Math.random : createSeededRandom(seed));

  if (options.targets) {
    const providedTargets = options.targets;

    if (providedTargets.length !== count) {
      throw new QuestionGenerationError(
        `targets 数量必须等于 count：${providedTargets.length} != ${count}`,
      );
    }

    if (
      new Set(providedTargets.map((word) => word.id)).size !==
      providedTargets.length
    ) {
      throw new QuestionGenerationError('targets 不能包含重复单词');
    }

    if (
      providedTargets.some((word) => word.chapter !== chapter)
    ) {
      throw new QuestionGenerationError('targets 必须与词池来自同一章节');
    }

    const poolIds = new Set(words.map((word) => word.id));
    if (providedTargets.some((word) => !poolIds.has(word.id))) {
      throw new QuestionGenerationError(
        'targets 中存在不属于词池的单词',
      );
    }
  }

  const typeSequence = buildQuestionTypeSequence({
    types,
    weights: options.weights,
    count,
    random,
  });

  const targets = shuffle(
    options.targets ?? words,
    random,
  ).slice(0, count);

  return targets.map((word, index) =>
    buildQuestion(
      word,
      words,
      typeSequence[index],
      random,
      idPrefix,
      index,
    ),
  );
}
