import type {
  AnswerRecord,
  ChapterId,
  Question,
  Word,
  WrongAnswerSnapshot,
  WrongWordRecord,
} from '../types';
import { getChapterConfig } from '../data/chapterConfig';
import {
  MAX_REVIEW_STAGE,
  REVIEW_MAX_QUESTIONS,
  REVIEW_MIN_QUESTIONS,
  getWrongWordTargetCount,
  isReviewDue,
  scheduleAfterCorrect,
  scheduleAfterWrong,
  selectReviewCandidates,
  selectWrongWordTargets,
} from '../game/reviewScheduler';
import { generateQuestions } from '../game/questionGenerator';
import { shuffle } from '../utils/random';
import { getStorage } from './storage';
import { loadAllChapters } from './vocabulary';

/**
 * 错词复习服务。
 *
 * 职责：
 * 1. 读取错词本；
 * 2. 结算时更新 reviewStage / nextReviewAt；
 * 3. 复习关按错词来源章节分组生成题目；
 * 4. 普通关提供 30% 错词目标。
 */

export class ReviewUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewUnavailableError';
  }
}

export interface ReviewRoundPlan {
  questions: Question[];
  /** 本局实际复习到的、开局前已存在于错词本的 wordId */
  reviewedWordIds: string[];
}

export interface WrongBookSummary {
  total: number;
  due: number;
  mastered: number;
}

export interface RoundOutcomeOptions {
  answers: readonly AnswerRecord[];
  wrongAnswers: readonly WrongAnswerSnapshot[];
  now?: Date;
}

export interface RoundOutcome {
  /** 本局开局前已在错词本中、且本局作答过的 wordId（去重） */
  reviewedWordIds: string[];
}

export async function loadWrongWords(): Promise<
  WrongWordRecord[]
> {
  const storage = await getStorage();
  return storage.getWrongWords();
}

export async function getWrongBookSummary(
  now: Date = new Date(),
): Promise<WrongBookSummary> {
  const records = await loadWrongWords();

  return {
    total: records.length,
    due: records.filter((record) => isReviewDue(record, now)).length,
    mastered: records.filter(
      (record) => record.reviewStage >= MAX_REVIEW_STAGE,
    ).length,
  };
}

/**
 * 结算时统一更新错词调度：
 * - 答错：阶段归零、当天到期、错误次数 +1；
 * - 答对且已在错词本：阶段 +1，按 1/3/7/30 天安排。
 *
 * 返回的 reviewedWordIds 用于每日任务“复习错词”去重计数。
 */
export async function applyRoundOutcome(
  options: RoundOutcomeOptions,
): Promise<RoundOutcome> {
  const { answers, wrongAnswers, now = new Date() } = options;

  if (answers.length === 0) {
    return { reviewedWordIds: [] };
  }

  const storage = await getStorage();
  const existing = await storage.getWrongWords();
  const existingById = new Map(
    existing.map((record) => [record.wordId, record]),
  );
  const wrongByWordId = new Map(
    wrongAnswers.map((answer) => [answer.wordId, answer]),
  );

  const reviewedWordIds = Array.from(
    new Set(answers.map((answer) => answer.wordId)),
  ).filter((wordId) => existingById.has(wordId));

  const handled = new Set<string>();
  const nowIso = now.toISOString();

  for (const answer of answers) {
    if (handled.has(answer.wordId)) continue;
    handled.add(answer.wordId);

    if (!answer.isCorrect) {
      const snapshot = wrongByWordId.get(answer.wordId);
      if (!snapshot) continue;

      const previous = existingById.get(answer.wordId);
      const schedule = scheduleAfterWrong(now);

      const record: WrongWordRecord = {
        wordId: snapshot.wordId,
        word: snapshot.word,
        phonetic: snapshot.phonetic,
        meaning: snapshot.meaning,
        chapter: snapshot.chapter,
        wrongCount: (previous?.wrongCount ?? 0) + 1,
        lastWrongAt: nowIso,
        reviewStage: schedule.reviewStage,
        nextReviewAt: schedule.nextReviewAt,
      };

      await storage.saveWrongWord(record);
      existingById.set(record.wordId, record);
      continue;
    }

    const previous = existingById.get(answer.wordId);
    if (!previous) continue;

    const schedule = scheduleAfterCorrect(
      previous.reviewStage,
      now,
    );

    const record: WrongWordRecord = {
      ...previous,
      reviewStage: schedule.reviewStage,
      nextReviewAt: schedule.nextReviewAt,
    };

    await storage.saveWrongWord(record);
    existingById.set(record.wordId, record);
  }

  return { reviewedWordIds };
}

/**
 * 普通关目标词：本章错词最多占 30%，其余随机补足。
 */
export async function buildNormalRoundTargets(
  chapter: ChapterId,
  words: readonly Word[],
  count: number,
  now: Date = new Date(),
): Promise<Word[]> {
  const records = await loadWrongWords();
  const wordById = new Map(words.map((word) => [word.id, word]));
  const limit = getWrongWordTargetCount(count);

  const prioritized = selectWrongWordTargets(
    records,
    chapter,
    limit,
    now,
  )
    .map((record) => wordById.get(record.wordId))
    .filter((word): word is Word => word !== undefined);

  const seen = new Set(prioritized.map((word) => word.id));
  const fillers = shuffle(
    words.filter((word) => !seen.has(word.id)),
  ).slice(0, Math.max(0, count - prioritized.length));

  return shuffle([...prioritized, ...fillers]).slice(0, count);
}

/**
 * 复习关：优先取到期/薄弱错词，最多 12 个；不足 10 个时用同章词补足。
 * 跨章时按章节分组生成，保证干扰项来自同一章。
 */
export async function createReviewRound(
  now: Date = new Date(),
): Promise<ReviewRoundPlan> {
  const records = await loadWrongWords();

  if (records.length === 0) {
    throw new ReviewUnavailableError(
      '错词本还没有可复习的单词，先去闯关吧。',
    );
  }

  const chapters = await loadAllChapters();
  const chapterWords = new Map<ChapterId, readonly Word[]>();
  const wordById = new Map<string, Word>();

  for (const chapter of chapters) {
    chapterWords.set(chapter.chapter, chapter.words);
    for (const word of chapter.words) {
      wordById.set(word.id, word);
    }
  }

  const validRecords = records.filter((record) =>
    wordById.has(record.wordId),
  );

  if (validRecords.length === 0) {
    throw new ReviewUnavailableError(
      '错词本中的单词已不在当前词库中，请先完成一局新游戏。',
    );
  }

  const selectedRecords = selectReviewCandidates(
    validRecords,
    REVIEW_MAX_QUESTIONS,
    now,
  );

  const selectedWords = selectedRecords
    .map((record) => wordById.get(record.wordId))
    .filter((word): word is Word => word !== undefined);

  const reviewedWordIds = selectedRecords.map(
    (record) => record.wordId,
  );

  const usedIds = new Set(selectedWords.map((word) => word.id));
  const chaptersWithWrongWords = new Set(
    selectedWords.map((word) => word.chapter),
  );

  const preferredPadding = chapters
    .filter((chapter) =>
      chaptersWithWrongWords.has(chapter.chapter),
    )
    .flatMap((chapter) => chapter.words)
    .filter((word) => !usedIds.has(word.id));
  const fallbackPadding = chapters
    .filter(
      (chapter) =>
        !chaptersWithWrongWords.has(chapter.chapter),
    )
    .flatMap((chapter) => chapter.words)
    .filter((word) => !usedIds.has(word.id));

  const paddingNeeded = Math.max(
    0,
    REVIEW_MIN_QUESTIONS - selectedWords.length,
  );

  const padding = [
    ...shuffle(preferredPadding),
    ...shuffle(fallbackPadding),
  ].slice(0, paddingNeeded);

  const targetWords = [...selectedWords, ...padding];

  const groups = new Map<ChapterId, Word[]>();

  for (const word of targetWords) {
    const group = groups.get(word.chapter) ?? [];
    group.push(word);
    groups.set(word.chapter, group);
  }

  const stamp = Date.now();
  const questions: Question[] = [];

  for (const [chapter, group] of groups) {
    const pool = chapterWords.get(chapter);
    const config = getChapterConfig(chapter);

    if (!pool || !config) {
      throw new ReviewUnavailableError(
        `第 ${chapter} 章词库不可用，无法生成复习题。`,
      );
    }

    questions.push(
      ...generateQuestions({
        words: pool,
        count: group.length,
        targets: group,
        types: config.focusQuestionTypes,
        weights: config.questionTypeWeights,
        idPrefix: `review-${stamp}-c${chapter}`,
      }),
    );
  }

  if (questions.length === 0) {
    throw new ReviewUnavailableError(
      '暂时无法生成复习题，请稍后重试。',
    );
  }

  return {
    questions: shuffle(questions),
    reviewedWordIds,
  };
}
