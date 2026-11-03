/**
 * 阶段 2 计分规则。
 *
 * 答对 +1 分、+1 金币；连击达到 3 / 5 / 10 时额外奖励金币。
 * 阶段 3 起，听写题可花费金币购买首字母提示。
 */
export const BASE_COIN_PER_CORRECT = 1;

export const COMBO_BONUSES: Record<number, number> = {
  3: 2,
  5: 4,
  10: 8,
};

/** 第 1—4 章听写提示价格 */
export const HINT_COST_COINS = 5;

/** 第 5、6 章听写提示价格：章节主题为“减少提示” */
export const HINT_COST_COINS_ADVANCED = 8;

export function getComboBonus(combo: number): number {
  return COMBO_BONUSES[combo] ?? 0;
}

export function calculateAccuracy(
  correctCount: number,
  answeredCount: number,
): number {
  if (answeredCount <= 0) return 0;
  return Math.min(1, Math.max(0, correctCount / answeredCount));
}
