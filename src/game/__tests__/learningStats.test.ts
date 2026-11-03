import { describe, expect, it } from 'vitest';
import type {
  LevelProgress,
  PlayerProgress,
  StarRating,
} from '../../types';
import { createDefaultProgress } from '../../services/storage/defaults';
import {
  calculateAccuracy,
  computeLearningStats,
  updateStudyStreak,
} from '../learningStats';
import { addLocalDays, toDateKey } from '../../utils/date';

function levelProgress(
  levelId: string,
  stars: StarRating,
): LevelProgress {
  return {
    levelId,
    stars,
    bestAccuracy: stars > 0 ? 0.8 : 0,
    bestTimeSec: 120,
    completedAt: new Date(2026, 9, 26).toISOString(),
  };
}

function withProgress(
  patch: Partial<PlayerProgress>,
): PlayerProgress {
  return {
    ...createDefaultProgress(),
    ...patch,
  };
}

describe('calculateAccuracy', () => {
  it('returns zero when nothing was answered', () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
    expect(calculateAccuracy(5, 0)).toBe(0);
  });

  it('clamps correct answers to the answered count', () => {
    expect(calculateAccuracy(3, 4)).toBe(0.75);
    expect(calculateAccuracy(9, 4)).toBe(1);
  });
});

describe('computeLearningStats', () => {
  it('returns an empty snapshot for a new player', () => {
    const stats = computeLearningStats(createDefaultProgress());

    expect(stats.learnedWords).toBe(0);
    expect(stats.totalAnswered).toBe(0);
    expect(stats.accuracy).toBe(0);
    expect(stats.completedLevels).toBe(0);
    expect(stats.totalStars).toBe(0);
    expect(stats.totalLevels).toBe(30);
    expect(stats.maxStars).toBe(90);
    expect(stats.chapterStars).toHaveLength(6);
  });

  it('counts unique learned words and overall accuracy', () => {
    const stats = computeLearningStats(
      withProgress({
        learnedWordIds: ['a', 'b', 'a'],
        totalAnswered: 4,
        totalCorrect: 3,
        streakDays: 5,
      }),
    );

    expect(stats.learnedWords).toBe(2);
    expect(stats.totalAnswered).toBe(4);
    expect(stats.totalCorrect).toBe(3);
    expect(stats.accuracy).toBe(0.75);
    expect(stats.streakDays).toBe(5);
  });

  it('aggregates completed levels and stars per chapter', () => {
    const stats = computeLearningStats(
      withProgress({
        levelProgress: {
          'c1-l1': levelProgress('c1-l1', 3),
          'c1-l2': levelProgress('c1-l2', 1),
          'c1-l3': levelProgress('c1-l3', 0),
          'c2-l1': levelProgress('c2-l1', 2),
          review: levelProgress('review', 3),
        },
      }),
    );

    expect(stats.completedLevels).toBe(3);
    expect(stats.totalStars).toBe(6);
    expect(stats.chapterStars[0]).toMatchObject({
      chapter: 1,
      stars: 4,
      completedLevels: 2,
      maxStars: 15,
    });
    expect(stats.chapterStars[1]).toMatchObject({
      chapter: 2,
      stars: 2,
      completedLevels: 1,
    });
  });
});

describe('updateStudyStreak', () => {
  const now = new Date(2026, 9, 26, 20, 0);
  const today = toDateKey(now);
  const yesterday = toDateKey(addLocalDays(now, -1));

  it('keeps the streak when already studied today', () => {
    const update = updateStudyStreak(
      { streakDays: 5, lastStudyDate: today },
      now,
    );

    expect(update.streakDays).toBe(5);
    expect(update.lastStudyDate).toBe(today);
    expect(update.changed).toBe(false);
  });

  it('increments when studied yesterday', () => {
    const update = updateStudyStreak(
      { streakDays: 5, lastStudyDate: yesterday },
      now,
    );

    expect(update.streakDays).toBe(6);
    expect(update.changed).toBe(true);
  });

  it('restarts after a gap', () => {
    const older = toDateKey(addLocalDays(now, -3));
    const update = updateStudyStreak(
      { streakDays: 9, lastStudyDate: older },
      now,
    );

    expect(update.streakDays).toBe(1);
  });

  it('starts at 1 for a new player', () => {
    const update = updateStudyStreak(
      { streakDays: 0, lastStudyDate: null },
      now,
    );

    expect(update.streakDays).toBe(1);
  });
});
