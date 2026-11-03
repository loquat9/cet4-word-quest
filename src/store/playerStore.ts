import { create } from 'zustand';
import type {
  PlayerProgress,
  RoundResult,
  StarRating,
} from '../types';
import type { DailyTaskId } from '../data/dailyTasks';
import { getDailyTask } from '../data/dailyTasks';
import { getStorage } from '../services/storage';
import { createDefaultProgress } from '../services/storage/defaults';
import { getNextLevelId } from '../game/rules';
import {
  addDailyTaskProgress,
  claimDailyTask as applyDailyTaskClaim,
  normalizeDailyTask,
} from '../game/dailyTasks';
import { updateStudyStreak } from '../game/learningStats';
import { toDateKey } from '../utils/date';

export interface CompleteRoundOptions {
  /** 本局开局前已在错词本中、且本局作答过的 wordId */
  reviewedWordIds?: readonly string[];
}

interface PlayerState {
  progress: PlayerProgress;
  hydrated: boolean;
  resetting: boolean;
  claimingTaskId: DailyTaskId | null;
  error: string | null;
  hydrate: () => Promise<void>;
  completeRound: (
    result: RoundResult,
    options?: CompleteRoundOptions,
  ) => Promise<void>;
  spendCoins: (amount: number) => Promise<boolean>;
  claimDailyTask: (taskId: DailyTaskId) => Promise<boolean>;
  ensureDailyTask: () => Promise<void>;
  resetProgress: () => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  progress: createDefaultProgress(),
  hydrated: false,
  resetting: false,
  claimingTaskId: null,
  error: null,

  hydrate: async () => {
    try {
      const storage = await getStorage();
      const progress = await storage.getProgress();
      const dailyTask = normalizeDailyTask(
        progress.dailyTask,
        toDateKey(new Date()),
      );

      set({
        progress: {
          ...progress,
          dailyTask,
          lastResult: progress.lastResult ?? null,
        },
        hydrated: true,
        error: null,
      });
    } catch (error) {
      console.error('[player] 读取失败', error);
      set({
        hydrated: true,
        error: '学习进度读取失败，已使用默认进度',
      });
    }
  },

  completeRound: async (result, options = {}) => {
    const current = get().progress;
    const now = new Date();
    const todayKey = toDateKey(now);
    const isRanked =
      result.kind === 'normal' || result.kind === 'boss';

    const previousLevel = current.levelProgress[result.levelId];
    const nextLevelId = getNextLevelId(result.levelId);
    const unlockedLevelIds = new Set(current.unlockedLevelIds);

    if (isRanked && result.stars > 0 && nextLevelId) {
      unlockedLevelIds.add(nextLevelId);
    }

    const stars = Math.max(
      previousLevel?.stars ?? 0,
      result.stars,
    ) as StarRating;

    const dailyTask = addDailyTaskProgress(
      current.dailyTask,
      {
        newWords: result.learnedWordIds.length,
        reviewedWordIds: options.reviewedWordIds ?? [],
        games: 1,
      },
      todayKey,
    );

    const streak = updateStudyStreak(current, now);

    const levelProgress = isRanked
      ? {
          ...current.levelProgress,
          [result.levelId]: {
            levelId: result.levelId,
            stars,
            bestAccuracy: Math.max(
              previousLevel?.bestAccuracy ?? 0,
              result.accuracy,
            ),
            bestTimeSec: previousLevel
              ? Math.min(
                  previousLevel.bestTimeSec,
                  result.timeUsedSec,
                )
              : result.timeUsedSec,
            completedAt: result.endedAt,
          },
        }
      : current.levelProgress;

    const next: PlayerProgress = {
      ...current,
      coins: current.coins + result.coins,
      unlockedLevelIds: isRanked
        ? [...unlockedLevelIds]
        : current.unlockedLevelIds,
      levelProgress,
      learnedWordIds: Array.from(
        new Set([...current.learnedWordIds, ...result.learnedWordIds]),
      ),
      totalAnswered: current.totalAnswered + result.answeredCount,
      totalCorrect: current.totalCorrect + result.correctCount,
      streakDays: streak.streakDays,
      lastStudyDate: streak.lastStudyDate,
      dailyTask,
      lastResult: result,
      updatedAt: now.toISOString(),
    };

    set({ progress: next, error: null });

    try {
      const storage = await getStorage();
      await storage.saveProgress(next);
    } catch (error) {
      console.error('[player] 成绩保存失败', error);
      set({ error: '成绩保存失败，请检查浏览器存储权限' });
    }
  },

  spendCoins: async (amount) => {
    if (!Number.isInteger(amount) || amount <= 0) return false;

    const current = get().progress;
    if (current.coins < amount) return false;

    const next: PlayerProgress = {
      ...current,
      coins: current.coins - amount,
      updatedAt: new Date().toISOString(),
    };

    // 先乐观扣除，避免连点导致同一笔余额被重复消费
    set({ progress: next, error: null });

    try {
      const storage = await getStorage();
      await storage.saveProgress(next);
      return true;
    } catch (error) {
      console.error('[player] 金币扣除保存失败', error);

      // 只有状态未被其他操作覆盖时才回滚
      if (get().progress === next) {
        set({
          progress: current,
          error: '金币扣除失败，请重试',
        });
      }

      return false;
    }
  },

  claimDailyTask: async (taskId) => {
    const definition = getDailyTask(taskId);
    if (!definition) return false;

    const current = get().progress;
    const claimed = applyDailyTaskClaim(
      current.dailyTask,
      definition,
      toDateKey(new Date()),
    );

    if (!claimed) return false;

    const next: PlayerProgress = {
      ...current,
      coins: current.coins + claimed.coins,
      dailyTask: claimed.task,
      updatedAt: new Date().toISOString(),
    };

    set({
      progress: next,
      claimingTaskId: taskId,
      error: null,
    });

    try {
      const storage = await getStorage();
      await storage.saveProgress(next);
      return true;
    } catch (error) {
      console.error('[player] 每日任务领取保存失败', error);

      if (get().progress === next) {
        set({
          progress: current,
          error: '领取失败，请重试',
        });
      }

      return false;
    } finally {
      set({ claimingTaskId: null });
    }
  },

  ensureDailyTask: async () => {
    const current = get().progress;
    const todayKey = toDateKey(new Date());
    const normalized = normalizeDailyTask(
      current.dailyTask,
      todayKey,
    );

    const needsSave =
      normalized.date !== current.dailyTask.date ||
      !Array.isArray(current.dailyTask.reviewedWordIds);

    if (!needsSave) return;

    const next: PlayerProgress = {
      ...current,
      dailyTask: normalized,
      updatedAt: new Date().toISOString(),
    };

    set({ progress: next });

    try {
      const storage = await getStorage();
      await storage.saveProgress(next);
    } catch (error) {
      console.error('[player] 每日任务重置保存失败', error);
      set({ error: '每日任务刷新失败，请刷新页面重试' });
    }
  },

  resetProgress: async () => {
    set({ resetting: true, error: null });

    try {
      const storage = await getStorage();
      await storage.resetProgressData();

      const progress = createDefaultProgress();
      await storage.saveProgress(progress);

      set({ progress, resetting: false, claimingTaskId: null });
    } catch (error) {
      console.error('[player] 重置失败', error);
      set({ resetting: false, error: '重置失败，请重试' });
    }
  },
}));
