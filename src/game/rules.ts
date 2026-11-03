import type { ChapterId, LevelKind, StarRating } from '../types';
import { LEVELS_PER_CHAPTER } from '../data/chapterConfig';

export interface LevelRule {
  label: string;
  minQuestions: number;
  maxQuestions: number;
  timeLimitSec: number;
}

/**
 * 阶段 0 固化后的题量与时长规则。
 * 普通关 12—15 题 / 5 分钟；Boss 关 15—18 题 / 4 分钟；复习关 10—12 题 / 5 分钟。
 */
export const LEVEL_RULES: Record<LevelKind, LevelRule> = {
  normal: {
    label: '普通关',
    minQuestions: 12,
    maxQuestions: 15,
    timeLimitSec: 300,
  },
  boss: {
    label: 'Boss 关',
    minQuestions: 15,
    maxQuestions: 18,
    timeLimitSec: 240,
  },
  review: {
    label: '复习关',
    minQuestions: 10,
    maxQuestions: 12,
    timeLimitSec: 300,
  },
  pk: {
    label: '好友 PK',
    minQuestions: 12,
    maxQuestions: 12,
    timeLimitSec: 300,
  },
};

export const HEARTS_PER_GAME = 3;

export const STAR_THRESHOLDS = [
  { minAccuracy: 0.9, stars: 3 },
  { minAccuracy: 0.75, stars: 2 },
  { minAccuracy: 0.6, stars: 1 },
] as const;

export function getStarsForAccuracy(accuracy: number): StarRating {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.75) return 2;
  if (accuracy >= 0.6) return 1;
  return 0;
}

export interface ParsedLevelId {
  chapter: ChapterId;
  levelIndex: number;
  kind: LevelKind;
}

const LEVEL_ID_PATTERN = /^c([1-6])-l([1-5])$/;

export function parseLevelId(levelId: string): ParsedLevelId | null {
  const match = LEVEL_ID_PATTERN.exec(levelId);
  if (!match) return null;

  const chapter = Number(match[1]) as ChapterId;
  const levelIndex = Number(match[2]);

  return {
    chapter,
    levelIndex,
    kind: levelIndex === 5 ? 'boss' : 'normal',
  };
}

export function isReviewLevelId(levelId: string): boolean {
  return levelId === 'review';
}

export function getNextLevelId(levelId: string): string | null {
  const parsed = parseLevelId(levelId);
  if (!parsed) return null;

  if (parsed.levelIndex < LEVELS_PER_CHAPTER) {
    return `c${parsed.chapter}-l${parsed.levelIndex + 1}`;
  }

  if (parsed.chapter < 6) {
    return `c${parsed.chapter + 1}-l1`;
  }

  return null;
}
