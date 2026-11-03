import type { ChapterId, WrongWordRecord } from '../types';
import {
  addLocalDays,
  diffLocalDays,
  startOfLocalDay,
  toDateKey,
} from '../utils/date';

/**
 * 简化间隔重复调度。
 *
 * 阶段与间隔：
 * 0 新错词/刚答错 -> 当天
 * 1 第一次复习正确 -> 1 天后
 * 2 第二次正确 -> 3 天后
 * 3 第三次正确 -> 7 天后
 * 4 已掌握 -> 30 天后抽查
 *
 * 答错任意阶段都会回到 0，并在当天重新进入复习队列。
 */

export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 30] as const;
export const MAX_REVIEW_STAGE = 4;
export const REVIEW_MIN_QUESTIONS = 10;
export const REVIEW_MAX_QUESTIONS = 12;
/** 普通关卡目标词中错词的最大占比 */
export const WRONG_WORD_TARGET_RATIO = 0.3;

export interface ReviewSchedule {
  reviewStage: number;
  nextReviewAt: string;
}

export function normalizeReviewStage(stage: number): number {
  if (!Number.isFinite(stage)) return 0;
  return Math.min(
    MAX_REVIEW_STAGE,
    Math.max(0, Math.floor(stage)),
  );
}

export function getReviewIntervalDays(stage: number): number {
  return REVIEW_INTERVAL_DAYS[normalizeReviewStage(stage)];
}

/** 答错：回到阶段 0，当天到期 */
export function scheduleAfterWrong(
  now: Date = new Date(),
): ReviewSchedule {
  return {
    reviewStage: 0,
    nextReviewAt: startOfLocalDay(now).toISOString(),
  };
}

/**
 * 答对：推进一个阶段，并按新阶段设置下次复习日。
 * 阶段 3 答对后进入已掌握（4），30 天后抽查；阶段 4 保持 4。
 */
export function scheduleAfterCorrect(
  currentStage: number,
  now: Date = new Date(),
): ReviewSchedule {
  const reviewStage = Math.min(
    MAX_REVIEW_STAGE,
    normalizeReviewStage(currentStage) + 1,
  );

  const nextDate = addLocalDays(
    startOfLocalDay(now),
    REVIEW_INTERVAL_DAYS[reviewStage],
  );

  return {
    reviewStage,
    nextReviewAt: nextDate.toISOString(),
  };
}

/** 是否已到期；非法日期按“待复习”处理 */
export function isReviewDue(
  record: Pick<WrongWordRecord, 'nextReviewAt'>,
  now: Date = new Date(),
): boolean {
  const dueAt = Date.parse(record.nextReviewAt);

  if (Number.isNaN(dueAt)) return true;

  return dueAt <= now.getTime();
}

export function countDueWrongWords(
  records: readonly WrongWordRecord[],
  now: Date = new Date(),
): number {
  return records.filter((record) => isReviewDue(record, now))
    .length;
}

/**
 * 复习状态文案：
 * - 到期：今天复习 / 待抽查
 * - 未到期：明天复习 / X 天后复习 / 已掌握
 */
export function describeReviewStatus(
  record: Pick<
    WrongWordRecord,
    'reviewStage' | 'nextReviewAt'
  >,
  now: Date = new Date(),
): string {
  const stage = normalizeReviewStage(record.reviewStage);

  if (isReviewDue(record, now)) {
    return stage >= MAX_REVIEW_STAGE ? '待抽查' : '今天复习';
  }

  const dueDate = new Date(record.nextReviewAt);
  const days = diffLocalDays(dueDate, now);

  if (stage >= MAX_REVIEW_STAGE) {
    return `已掌握 · ${Math.max(1, days)} 天后抽查`;
  }

  if (days <= 1) return '明天复习';

  return `${days} 天后复习`;
}

/**
 * 错词本默认排序：错误次数降序，最近错误时间降序，单词升序兜底。
 */
export function sortWrongWords(
  records: readonly WrongWordRecord[],
): WrongWordRecord[] {
  return [...records].sort((left, right) => {
    if (right.wrongCount !== left.wrongCount) {
      return right.wrongCount - left.wrongCount;
    }

    const leftTime = Date.parse(left.lastWrongAt);
    const rightTime = Date.parse(right.lastWrongAt);

    if (
      !Number.isNaN(leftTime) &&
      !Number.isNaN(rightTime) &&
      rightTime !== leftTime
    ) {
      return rightTime - leftTime;
    }

    return left.word.localeCompare(right.word);
  });
}

function compareDuePriority(
  left: WrongWordRecord,
  right: WrongWordRecord,
): number {
  if (left.reviewStage !== right.reviewStage) {
    return left.reviewStage - right.reviewStage;
  }

  if (right.wrongCount !== left.wrongCount) {
    return right.wrongCount - left.wrongCount;
  }

  const leftTime = Date.parse(left.lastWrongAt);
  const rightTime = Date.parse(right.lastWrongAt);

  if (Number.isNaN(leftTime)) return 1;
  if (Number.isNaN(rightTime)) return -1;

  return leftTime - rightTime;
}

function compareUpcomingPriority(
  left: WrongWordRecord,
  right: WrongWordRecord,
): number {
  const leftTime = Date.parse(left.nextReviewAt);
  const rightTime = Date.parse(right.nextReviewAt);

  if (leftTime !== rightTime) {
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return leftTime - rightTime;
  }

  if (right.wrongCount !== left.wrongCount) {
    return right.wrongCount - left.wrongCount;
  }

  return left.word.localeCompare(right.word);
}

/**
 * 复习关抽词：到期词优先，其次按下次复习时间补足。
 */
export function selectReviewCandidates(
  records: readonly WrongWordRecord[],
  limit: number = REVIEW_MAX_QUESTIONS,
  now: Date = new Date(),
): WrongWordRecord[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (safeLimit === 0) return [];

  const due = records
    .filter((record) => isReviewDue(record, now))
    .sort(compareDuePriority);

  const upcoming = records
    .filter((record) => !isReviewDue(record, now))
    .sort(compareUpcomingPriority);

  return [...due, ...upcoming].slice(0, safeLimit);
}

/**
 * 普通关卡错词目标：同章、到期优先、错误次数高优先。
 */
export function selectWrongWordTargets(
  records: readonly WrongWordRecord[],
  chapter: ChapterId,
  limit: number,
  now: Date = new Date(),
): WrongWordRecord[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (safeLimit === 0) return [];

  return records
    .filter((record) => record.chapter === chapter)
    .sort((left, right) => {
      const leftDue = isReviewDue(left, now);
      const rightDue = isReviewDue(right, now);

      if (leftDue !== rightDue) return leftDue ? -1 : 1;

      return compareDuePriority(left, right);
    })
    .slice(0, safeLimit);
}

/** 普通关错词目标数量：本题量 × 30%，向下取整 */
export function getWrongWordTargetCount(
  questionCount: number,
): number {
  if (!Number.isFinite(questionCount) || questionCount <= 0) {
    return 0;
  }

  return Math.floor(questionCount * WRONG_WORD_TARGET_RATIO);
}

/** 当前本地日期 key，供任务与连续天数复用 */
export function getTodayKey(now: Date = new Date()): string {
  return toDateKey(now);
}
