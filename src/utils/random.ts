/**
 * 可复现的伪随机数工具。
 *
 * 同一 seed 必须产生同一序列，供 QuestionGenerator 单测与后续 PK 同题对战使用。
 */

export type RandomSource = () => number;

/**
 * mulberry32：轻量、确定性良好的 32 位种子随机数生成器。
 * 返回 [0, 1) 区间的数。
 */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates 洗牌，不修改原数组。
 */
export function shuffle<T>(
  items: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }

  return result;
}
