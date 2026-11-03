import { describe, expect, it } from 'vitest';
import type {
  LevelProgress,
  PlayerProgress,
  StarRating,
} from '../../types';
import { createDefaultProgress } from '../../services/storage/defaults';
import {
  getChapterLevelStates,
  getChapterMapStats,
  getLevelMapState,
  getLevelStars,
  getNextPlayableLevelId,
  getOverallMapStats,
  isLevelUnlocked,
  parseMapLevelId,
} from '../mapProgress';

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

function withMap(
  unlockedLevelIds: string[],
  stars: Record<string, StarRating> = {},
): PlayerProgress {
  return {
    ...createDefaultProgress(),
    unlockedLevelIds,
    levelProgress: Object.fromEntries(
      Object.entries(stars).map(([levelId, value]) => [
        levelId,
        levelProgress(levelId, value),
      ]),
    ),
  };
}

describe('parseMapLevelId', () => {
  it('parses valid chapter/level ids', () => {
    expect(parseMapLevelId('c1-l1')).toEqual({
      chapter: 1,
      index: 1,
    });
    expect(parseMapLevelId('c6-l5')).toEqual({
      chapter: 6,
      index: 5,
    });
  });

  it('rejects invalid ids', () => {
    expect(parseMapLevelId('review')).toBeNull();
    expect(parseMapLevelId('pk')).toBeNull();
    expect(parseMapLevelId('c7-l1')).toBeNull();
    expect(parseMapLevelId('c1-l6')).toBeNull();
  });
});

describe('level state', () => {
  it('reads unlock and star state', () => {
    const progress = withMap(
      ['c1-l1', 'c1-l2'],
      { 'c1-l1': 3, 'c1-l2': 1 },
    );

    expect(isLevelUnlocked('c1-l1', progress)).toBe(true);
    expect(isLevelUnlocked('c1-l3', progress)).toBe(false);
    expect(getLevelStars('c1-l1', progress)).toBe(3);
    expect(getLevelStars('c1-l3', progress)).toBe(0);

    const state = getLevelMapState('c1-l2', progress);
    expect(state).toMatchObject({
      levelId: 'c1-l2',
      chapter: 1,
      index: 2,
      unlocked: true,
      stars: 1,
      completed: true,
      isBoss: false,
    });
  });

  it('marks boss levels and clamps stars', () => {
    const progress = withMap(
      ['c1-l5'],
      { 'c1-l5': 5 as StarRating },
    );

    const state = getLevelMapState('c1-l5', progress);

    expect(state?.isBoss).toBe(true);
    expect(state?.stars).toBe(3);
  });

  it('returns null for non-level ids', () => {
    expect(
      getLevelMapState('review', createDefaultProgress()),
    ).toBeNull();
  });
});

describe('chapter stats', () => {
  it('aggregates stars, completion and unlocks', () => {
    const progress = withMap(
      ['c1-l1', 'c1-l2', 'c1-l3'],
      { 'c1-l1': 3, 'c1-l2': 1 },
    );

    expect(getChapterLevelStates(1, progress)).toHaveLength(5);

    const stats = getChapterMapStats(1, progress);

    expect(stats).toMatchObject({
      chapter: 1,
      stars: 4,
      maxStars: 15,
      completedLevels: 2,
      unlockedLevels: 3,
      totalLevels: 5,
    });
  });
});

describe('overall map stats', () => {
  it('sums stars and ignores review/pk in unlocks', () => {
    const progress = withMap(
      ['c1-l1', 'c1-l2', 'review', 'pk'],
      { 'c1-l1': 3, 'c1-l2': 2 },
    );

    const stats = getOverallMapStats(progress);

    expect(stats).toMatchObject({
      stars: 5,
      maxStars: 90,
      completedLevels: 2,
      unlockedLevels: 2,
      totalLevels: 30,
    });
  });

  it('handles a fully completed map', () => {
    const unlocked: string[] = [];
    const stars: Record<string, StarRating> = {};

    for (let chapter = 1; chapter <= 6; chapter += 1) {
      for (let level = 1; level <= 5; level += 1) {
        const id = `c${chapter}-l${level}`;
        unlocked.push(id);
        stars[id] = 3;
      }
    }

    const stats = getOverallMapStats(withMap(unlocked, stars));

    expect(stats.stars).toBe(90);
    expect(stats.completedLevels).toBe(30);
    expect(stats.unlockedLevels).toBe(30);
  });
});

describe('getNextPlayableLevelId', () => {
  it('starts from the first unlocked level', () => {
    expect(
      getNextPlayableLevelId(createDefaultProgress()),
    ).toBe('c1-l1');
  });

  it('returns the first unlocked level without stars', () => {
    const progress = withMap(
      ['c1-l1', 'c1-l2'],
      { 'c1-l1': 2 },
    );

    expect(getNextPlayableLevelId(progress)).toBe('c1-l2');
  });

  it('prioritizes an incomplete level over a later unlocked one', () => {
    const progress = withMap(
      ['c1-l1', 'c1-l2'],
      { 'c1-l2': 3 },
    );

    expect(getNextPlayableLevelId(progress)).toBe('c1-l1');
  });

  it('returns the last unlocked level when everything is complete', () => {
    const unlocked: string[] = [];
    const stars: Record<string, StarRating> = {};

    for (let chapter = 1; chapter <= 6; chapter += 1) {
      for (let level = 1; level <= 5; level += 1) {
        const id = `c${chapter}-l${level}`;
        unlocked.push(id);
        stars[id] = 3;
      }
    }

    expect(
      getNextPlayableLevelId(withMap(unlocked, stars)),
    ).toBe('c6-l5');
  });

  it('falls back to c1-l1 for inconsistent unlock data', () => {
    expect(
      getNextPlayableLevelId(withMap(['review', 'pk'])),
    ).toBe('c1-l1');
  });
});
