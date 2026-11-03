import type { DailyTaskProgress } from '../types';
import {
  DAILY_TASKS,
  type DailyTaskDefinition,
  type DailyTaskId,
  type DailyTaskMetric,
} from '../data/dailyTasks';
import { toDateKey } from '../utils/date';

/**
 * 每日任务纯逻辑。
 *
 * 不依赖 store 或存储层，便于单测；玩家状态更新由 playerStore 调用。
 */

export interface DailyTaskUpdate {
  /** 本局新学词数 */
  newWords?: number;
  /** 本局复习到的错词 wordId（内部会去重） */
  reviewedWordIds?: readonly string[];
  /** 本局完成局数，通常为 1 */
  games?: number;
}

function toCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === 'string' && value.length > 0,
      ),
    ),
  );
}

export function createDailyTask(dateKey: string): DailyTaskProgress {
  return {
    date: dateKey,
    newWordsLearned: 0,
    wrongWordsReviewed: 0,
    gamesPlayed: 0,
    reviewedWordIds: [],
    claimedTaskIds: [],
  };
}

/**
 * 归一化每日任务：
 * - 日期变化时重置；
 * - 兼容旧数据缺失 reviewedWordIds 的情况；
 * - 清理负数/非法计数与重复 id。
 */
export function normalizeDailyTask(
  task: DailyTaskProgress | null | undefined,
  todayKey: string = toDateKey(new Date()),
): DailyTaskProgress {
  if (!task || task.date !== todayKey) {
    return createDailyTask(todayKey);
  }

  const reviewedWordIds = uniqueStrings(task.reviewedWordIds);

  return {
    date: todayKey,
    newWordsLearned: toCount(task.newWordsLearned),
    wrongWordsReviewed: reviewedWordIds.length,
    gamesPlayed: toCount(task.gamesPlayed),
    reviewedWordIds,
    claimedTaskIds: uniqueStrings(task.claimedTaskIds),
  };
}

/**
 * 累加本局进度。
 * 复习错词按 wordId 去重，而不是按答题次数累加。
 */
export function addDailyTaskProgress(
  task: DailyTaskProgress | null | undefined,
  update: DailyTaskUpdate,
  todayKey: string = toDateKey(new Date()),
): DailyTaskProgress {
  const current = normalizeDailyTask(task, todayKey);

  const reviewedWordIds = uniqueStrings([
    ...current.reviewedWordIds,
    ...(update.reviewedWordIds ?? []),
  ]);

  return {
    ...current,
    newWordsLearned:
      current.newWordsLearned + toCount(update.newWords),
    wrongWordsReviewed: reviewedWordIds.length,
    reviewedWordIds,
    gamesPlayed: current.gamesPlayed + toCount(update.games),
  };
}

export function getDailyTaskProgress(
  task: DailyTaskProgress,
  definition: DailyTaskDefinition,
): number {
  return task[definition.metric as DailyTaskMetric];
}

export function isDailyTaskComplete(
  task: DailyTaskProgress,
  definition: DailyTaskDefinition,
): boolean {
  return (
    getDailyTaskProgress(task, definition) >= definition.target
  );
}

export function isDailyTaskClaimed(
  task: DailyTaskProgress,
  definition: DailyTaskDefinition,
): boolean {
  return task.claimedTaskIds.includes(definition.id);
}

export function canClaimDailyTask(
  task: DailyTaskProgress,
  definition: DailyTaskDefinition,
): boolean {
  return (
    isDailyTaskComplete(task, definition) &&
    !isDailyTaskClaimed(task, definition)
  );
}

/**
 * 领取任务奖励。返回新任务状态与金币数；不可领取时返回 null。
 */
export function claimDailyTask(
  task: DailyTaskProgress | null | undefined,
  definition: DailyTaskDefinition,
  todayKey: string = toDateKey(new Date()),
): { task: DailyTaskProgress; coins: number } | null {
  const current = normalizeDailyTask(task, todayKey);

  if (!canClaimDailyTask(current, definition)) {
    return null;
  }

  return {
    task: {
      ...current,
      claimedTaskIds: [
        ...current.claimedTaskIds,
        definition.id,
      ],
    },
    coins: definition.rewardCoins,
  };
}

/** 当前可领取的金币合计，用于首页展示 */
export function getClaimableCoins(
  task: DailyTaskProgress,
): number {
  return DAILY_TASKS.reduce((total, definition) => {
    return canClaimDailyTask(task, definition)
      ? total + definition.rewardCoins
      : total;
  }, 0);
}

/** 已完成但未领取的任务 id */
export function getClaimableTaskIds(
  task: DailyTaskProgress,
): DailyTaskId[] {
  return DAILY_TASKS.filter((definition) =>
    canClaimDailyTask(task, definition),
  ).map((definition) => definition.id);
}

export { getDailyTask } from '../data/dailyTasks';
