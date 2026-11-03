import type {
  ChapterId,
  PlayerProgress,
  StarRating,
} from '../types';
import {
  CHAPTERS,
  LEVELS_PER_CHAPTER,
} from '../data/chapterConfig';
import { VOCABULARY_META } from '../data/cet4/meta';
import {
  addLocalDays,
  toDateKey,
} from '../utils/date';

/**
 * 学习统计聚合。
 *
 * 所有数据来自 PlayerProgress，不额外持久化统计快照，
 * 避免结算时出现“统计与实际进度不一致”的双写问题。
 */

export interface ChapterStarStats {
  chapter: ChapterId;
  title: string;
  stars: number;
  maxStars: number;
  completedLevels: number;
}

export interface LearningStats {
  learnedWords: number;
  totalWords: number;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  streakDays: number;
  completedLevels: number;
  totalLevels: number;
  totalStars: number;
  maxStars: number;
  chapterStars: ChapterStarStats[];
}

export interface StreakUpdate {
  streakDays: number;
  lastStudyDate: string;
  /** 今天是否第一次完成学习（用于判断是否需要落库） */
  changed: boolean;
}

function clampStars(value: number | undefined): StarRating {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.min(3, Math.max(0, Math.floor(value))) as StarRating;
}

export function calculateAccuracy(
  totalCorrect: number,
  totalAnswered: number,
): number {
  if (!Number.isFinite(totalAnswered) || totalAnswered <= 0) {
    return 0;
  }

  const correct = Math.max(0, Math.min(totalCorrect, totalAnswered));
  return Math.min(1, correct / totalAnswered);
}

export function computeLearningStats(
  progress: PlayerProgress,
): LearningStats {
  const learnedWords = new Set(progress.learnedWordIds).size;

  let completedLevels = 0;
  let totalStars = 0;

  const chapterStars: ChapterStarStats[] = CHAPTERS.map((chapter) => {
    let stars = 0;
    let completed = 0;

    for (
      let levelIndex = 1;
      levelIndex <= LEVELS_PER_CHAPTER;
      levelIndex += 1
    ) {
      const level = progress.levelProgress[
        `c${chapter.id}-l${levelIndex}`
      ];
      const levelStars = clampStars(level?.stars);

      stars += levelStars;
      if (levelStars > 0) completed += 1;
    }

    completedLevels += completed;
    totalStars += stars;

    return {
      chapter: chapter.id,
      title: chapter.title,
      stars,
      maxStars: LEVELS_PER_CHAPTER * 3,
      completedLevels: completed,
    };
  });

  const totalLevels = CHAPTERS.length * LEVELS_PER_CHAPTER;

  return {
    learnedWords,
    totalWords: VOCABULARY_META.totalWords,
    totalAnswered: Math.max(0, progress.totalAnswered),
    totalCorrect: Math.max(0, progress.totalCorrect),
    accuracy: calculateAccuracy(
      progress.totalCorrect,
      progress.totalAnswered,
    ),
    streakDays: Math.max(0, progress.streakDays),
    completedLevels,
    totalLevels,
    totalStars,
    maxStars: totalLevels * 3,
    chapterStars,
  };
}

/**
 * 完成一局后更新连续学习天数。
 * - 今天已学过：不变；
 * - 昨天学过：+1；
 * - 中断或首次：从 1 开始。
 */
export function updateStudyStreak(
  progress: Pick<
    PlayerProgress,
    'streakDays' | 'lastStudyDate'
  >,
  now: Date = new Date(),
): StreakUpdate {
  const todayKey = toDateKey(now);
  const yesterdayKey = toDateKey(addLocalDays(now, -1));

  if (progress.lastStudyDate === todayKey) {
    return {
      streakDays: Math.max(0, progress.streakDays),
      lastStudyDate: todayKey,
      changed: false,
    };
  }

  const previous = Math.max(0, progress.streakDays);

  const streakDays =
    progress.lastStudyDate === yesterdayKey ? previous + 1 : 1;

  return {
    streakDays,
    lastStudyDate: todayKey,
    changed: true,
  };
}
