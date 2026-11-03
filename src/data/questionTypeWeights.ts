import type { ChapterId, QuestionType } from '../types';

/**
 * 六章题型权重（单一数据源）。
 *
 * 章节定位来自产品需求：
 * - 第 1 章：看词选义 / 看义选词；
 * - 第 2 章：加入听音辨词；
 * - 第 3 章：例句填空为主，穿插看义选词；
 * - 第 4 章：听音辨词、听写拼写为主；
 * - 第 5 章：听写拼写为主，减少提示；
 * - 第 6 章：五类混合。
 *
 * 权重只需相对大小，出题逻辑会归一化；未列出的题型不会出现。
 */
export const CHAPTER_QUESTION_TYPE_WEIGHTS: Record<
  ChapterId,
  Partial<Record<QuestionType, number>>
> = {
  1: {
    'word-to-meaning': 0.5,
    'meaning-to-word': 0.5,
  },
  2: {
    'word-to-meaning': 0.35,
    'meaning-to-word': 0.35,
    'listen-to-word': 0.3,
  },
  3: {
    'example-fill': 0.75,
    'meaning-to-word': 0.25,
  },
  4: {
    'listen-to-word': 0.55,
    dictation: 0.45,
  },
  5: {
    dictation: 0.7,
    'listen-to-word': 0.3,
  },
  6: {
    'word-to-meaning': 0.2,
    'meaning-to-word': 0.2,
    'listen-to-word': 0.2,
    'example-fill': 0.2,
    dictation: 0.2,
  },
};

/** 题型中文名，供卡片角标与结果页复用 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  'word-to-meaning': '看词选义',
  'meaning-to-word': '看义选词',
  'listen-to-word': '听音辨词',
  'example-fill': '例句填空',
  dictation: '听写拼写',
};

/** 卡片底部的一句话操作提示 */
export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  'word-to-meaning': '选择正确的中文释义',
  'meaning-to-word': '选择正确的英文单词',
  'listen-to-word': '听发音，选出你听到的单词',
  'example-fill': '根据例句选择正确的单词',
  dictation: '根据发音与释义，输入完整单词',
};

/** 由权重表推导某章可用题型，保证顺序稳定 */
export function getChapterQuestionTypes(
  chapter: ChapterId,
): QuestionType[] {
  return Object.keys(
    CHAPTER_QUESTION_TYPE_WEIGHTS[chapter],
  ) as QuestionType[];
}
