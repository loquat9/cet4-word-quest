import type { LevelConfig } from '../types';
import { CHAPTERS, LEVELS_PER_CHAPTER } from './chapterConfig';
import { HEARTS_PER_GAME, LEVEL_RULES } from '../game/rules';
import {
  HINT_COST_COINS,
  HINT_COST_COINS_ADVANCED,
} from '../game/scoring';
import { ALL_QUESTION_TYPES } from '../game/questionGenerator';

/** 第 5、6 章主题为“减少提示”，提示价格更高 */
function getHintCostCoins(chapter: number): number {
  return chapter >= 5 ? HINT_COST_COINS_ADVANCED : HINT_COST_COINS;
}

function getQuestionCount(
  chapter: number,
  levelIndex: number,
  kind: 'normal' | 'boss',
): number {
  if (kind === 'normal') {
    // 第 1—4 关分别为 12 / 13 / 14 / 15 题
    return 11 + levelIndex;
  }

  // Boss 关 16 题；第 6 章最终 Boss 18 题
  return chapter === 6 ? 18 : 16;
}

function getUnlockAfterLevelId(
  chapter: number,
  levelIndex: number,
): string | undefined {
  if (levelIndex > 1) {
    return `c${chapter}-l${levelIndex - 1}`;
  }

  if (chapter > 1) {
    return `c${chapter - 1}-l${LEVELS_PER_CHAPTER}`;
  }

  return undefined;
}

function buildLevels(): LevelConfig[] {
  return CHAPTERS.flatMap((chapter) =>
    Array.from({ length: LEVELS_PER_CHAPTER }, (_, index) => {
      const levelIndex = index + 1;
      const kind: 'normal' | 'boss' =
        levelIndex === chapter.bossLevelIndex ? 'boss' : 'normal';
      const rule = LEVEL_RULES[kind];

      return {
        id: `c${chapter.id}-l${levelIndex}`,
        chapter: chapter.id,
        index: levelIndex,
        title: `${chapter.title} · 第 ${levelIndex} 关`,
        kind,
        questionCount: getQuestionCount(
          chapter.id,
          levelIndex,
          kind,
        ),
        timeLimitSec: rule.timeLimitSec,
        hearts: HEARTS_PER_GAME,
        questionTypes: [...chapter.focusQuestionTypes],
        hintCostCoins: getHintCostCoins(chapter.id),
        unlockAfterLevelId: getUnlockAfterLevelId(
          chapter.id,
          levelIndex,
        ),
      };
    }),
  );
}

export const LEVELS: LevelConfig[] = buildLevels();

/**
 * 错词复习关。
 * 章节字段仅用于满足 LevelConfig 结构；复习关实际按错词来源章节分组出题。
 */
export const REVIEW_LEVEL: LevelConfig = {
  id: 'review',
  chapter: 1,
  index: 0,
  title: '错词复习',
  kind: 'review',
  questionCount: 12,
  timeLimitSec: 300,
  hearts: HEARTS_PER_GAME,
  questionTypes: [...ALL_QUESTION_TYPES],
  hintCostCoins: HINT_COST_COINS,
};

/**
 * 好友 PK 固定关。
 * 固定第 6 章 12 题，双方使用同一 seed 时题目与顺序一致。
 */
export const PK_LEVEL: LevelConfig = {
  id: 'pk',
  chapter: 6,
  index: 0,
  title: '好友 PK',
  kind: 'pk',
  questionCount: LEVEL_RULES.pk.minQuestions,
  timeLimitSec: LEVEL_RULES.pk.timeLimitSec,
  hearts: HEARTS_PER_GAME,
  questionTypes: [...ALL_QUESTION_TYPES],
  hintCostCoins: HINT_COST_COINS,
};

export function getLevelConfig(
  levelId: string,
): LevelConfig | undefined {
  if (levelId === REVIEW_LEVEL.id) return REVIEW_LEVEL;
  if (levelId === PK_LEVEL.id) return PK_LEVEL;
  return LEVELS.find((level) => level.id === levelId);
}
