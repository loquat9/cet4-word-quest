import type {
  ChapterId,
  PlayerProgress,
  StarRating,
} from '../types';
import {
  CHAPTERS,
  LEVELS_PER_CHAPTER,
} from '../data/chapterConfig';

/**
 * 地图解锁与星级纯逻辑。
 *
 * 只读取 PlayerProgress，不访问存储，便于单测。
 * 关卡 id 约定：c{1-6}-l{1-5}。
 */

const LEVEL_ID_PATTERN = /^c([1-6])-l([1-5])$/;

export interface ParsedMapLevelId {
  chapter: ChapterId;
  index: number;
}

export interface LevelMapState {
  levelId: string;
  chapter: ChapterId;
  index: number;
  isBoss: boolean;
  unlocked: boolean;
  stars: StarRating;
  completed: boolean;
}

export interface ChapterMapStats {
  chapter: ChapterId;
  title: string;
  stars: number;
  maxStars: number;
  completedLevels: number;
  unlockedLevels: number;
  totalLevels: number;
}

export interface OverallMapStats {
  stars: number;
  maxStars: number;
  completedLevels: number;
  unlockedLevels: number;
  totalLevels: number;
}

function clampStars(value: number | undefined): StarRating {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.min(3, Math.max(0, Math.floor(value))) as StarRating;
}

export function parseMapLevelId(
  levelId: string,
): ParsedMapLevelId | null {
  const match = LEVEL_ID_PATTERN.exec(levelId);
  if (!match) return null;

  return {
    chapter: Number(match[1]) as ChapterId,
    index: Number(match[2]),
  };
}

export function getLevelStars(
  levelId: string,
  progress: PlayerProgress,
): StarRating {
  return clampStars(progress.levelProgress[levelId]?.stars);
}

export function isLevelUnlocked(
  levelId: string,
  progress: PlayerProgress,
): boolean {
  return progress.unlockedLevelIds.includes(levelId);
}

export function getLevelMapState(
  levelId: string,
  progress: PlayerProgress,
): LevelMapState | null {
  const parsed = parseMapLevelId(levelId);
  if (!parsed) return null;

  const stars = getLevelStars(levelId, progress);
  const chapter = CHAPTERS.find(
    (item) => item.id === parsed.chapter,
  );

  return {
    levelId,
    chapter: parsed.chapter,
    index: parsed.index,
    isBoss: chapter?.bossLevelIndex === parsed.index,
    unlocked: isLevelUnlocked(levelId, progress),
    stars,
    completed: stars > 0,
  };
}

export function getChapterLevelStates(
  chapter: ChapterId,
  progress: PlayerProgress,
): LevelMapState[] {
  return Array.from(
    { length: LEVELS_PER_CHAPTER },
    (_, index) =>
      getLevelMapState(
        `c${chapter}-l${index + 1}`,
        progress,
      ),
  ).filter((state): state is LevelMapState => state !== null);
}

export function getChapterMapStats(
  chapter: ChapterId,
  progress: PlayerProgress,
): ChapterMapStats {
  const levelStates = getChapterLevelStates(chapter, progress);
  const chapterConfig = CHAPTERS.find(
    (item) => item.id === chapter,
  );

  return {
    chapter,
    title: chapterConfig?.title ?? `第 ${chapter} 章`,
    stars: levelStates.reduce(
      (total, state) => total + state.stars,
      0,
    ),
    maxStars: LEVELS_PER_CHAPTER * 3,
    completedLevels: levelStates.filter(
      (state) => state.completed,
    ).length,
    unlockedLevels: levelStates.filter(
      (state) => state.unlocked,
    ).length,
    totalLevels: LEVELS_PER_CHAPTER,
  };
}

export function getOverallMapStats(
  progress: PlayerProgress,
): OverallMapStats {
  const validUnlocked = new Set(
    progress.unlockedLevelIds.filter((levelId) =>
      LEVEL_ID_PATTERN.test(levelId),
    ),
  );

  let stars = 0;
  let completedLevels = 0;

  for (const chapter of CHAPTERS) {
    for (
      let levelIndex = 1;
      levelIndex <= LEVELS_PER_CHAPTER;
      levelIndex += 1
    ) {
      const levelId = `c${chapter.id}-l${levelIndex}`;
      const levelStars = getLevelStars(levelId, progress);

      stars += levelStars;
      if (levelStars > 0) completedLevels += 1;
    }
  }

  const totalLevels = CHAPTERS.length * LEVELS_PER_CHAPTER;

  return {
    stars,
    maxStars: totalLevels * 3,
    completedLevels,
    unlockedLevels: validUnlocked.size,
    totalLevels,
  };
}

/**
 * “继续闯关”目标：
 * 优先第一个已解锁但 0 星的关卡；
 * 全部完成时返回最后一个已解锁关卡；
 * 数据异常时回退到 c1-l1。
 */
export function getNextPlayableLevelId(
  progress: PlayerProgress,
): string {
  const unlocked = new Set(progress.unlockedLevelIds);
  let lastUnlocked: string | null = null;

  for (const chapter of CHAPTERS) {
    for (
      let levelIndex = 1;
      levelIndex <= LEVELS_PER_CHAPTER;
      levelIndex += 1
    ) {
      const levelId = `c${chapter.id}-l${levelIndex}`;

      if (!unlocked.has(levelId)) continue;

      lastUnlocked = levelId;

      if (getLevelStars(levelId, progress) === 0) {
        return levelId;
      }
    }
  }

  return lastUnlocked ?? 'c1-l1';
}
