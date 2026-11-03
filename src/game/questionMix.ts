import type { QuestionType } from '../types';
import { shuffle, type RandomSource } from '../utils/random';

/**
 * 题型配额与序列生成。
 *
 * 只做纯计算，不依赖词库或 React，便于单测与后续 PK 复用。
 * 目标：
 * 1. 题量允许时，每种参与混合的题型至少出现 1 次；
 * 2. 剩余题量按权重用最大余数法分配，总数严格等于 count；
 * 3. 序列尽量打散，避免同题型连续出现；在权重允许时最多连续 3 题。
 */

export class QuestionMixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionMixError';
  }
}

export interface QuestionTypeQuota {
  type: QuestionType;
  count: number;
}

export interface BuildQuestionTypeSequenceOptions {
  types: readonly QuestionType[];
  /** 相对权重，键可只覆盖 types 的子集；未提供时均匀分配 */
  weights?: Partial<Record<QuestionType, number>>;
  count: number;
  random?: RandomSource;
}

/** 若存在基础题型，优先作为第一题热身 */
const WARMUP_TYPES: readonly QuestionType[] = [
  'word-to-meaning',
  'meaning-to-word',
];

function validateOptions(
  types: readonly QuestionType[],
  count: number,
): void {
  if (types.length === 0) {
    throw new QuestionMixError('至少需要一种题型');
  }

  if (new Set(types).size !== types.length) {
    throw new QuestionMixError('题型列表不能包含重复项');
  }

  if (!Number.isInteger(count) || count <= 0) {
    throw new QuestionMixError(
      `题量必须是正整数，收到：${String(count)}`,
    );
  }
}

/**
 * 将权重归一化为与 types 等长的非负数组。
 * 未提供权重或权重全为 0 时退化为均匀权重。
 */
function resolveWeights(
  types: readonly QuestionType[],
  weights?: Partial<Record<QuestionType, number>>,
): number[] {
  if (!weights) return types.map(() => 1);

  const resolved = types.map((type) =>
    Math.max(0, Number(weights[type] ?? 0)),
  );

  if (resolved.every((weight) => weight === 0)) {
    return types.map(() => 1);
  }

  return resolved;
}

/** 从剩余类型中按权重抽一个，不修改入参 */
function pickWeightedIndex(
  weights: readonly number[],
  available: readonly boolean[],
  random: RandomSource,
): number {
  const candidates = weights
    .map((weight, index) => ({ weight, index }))
    .filter((entry) => available[entry.index]);

  const total = candidates.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );

  if (total <= 0) {
    return candidates[Math.floor(random() * candidates.length)].index;
  }

  let cursor = random() * total;

  for (const entry of candidates) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.index;
  }

  return candidates[candidates.length - 1].index;
}

/**
 * 计算每种题型的题数。
 *
 * 题量小于题型数时，按权重无放回抽取 count 种题型，每种 1 题；
 * 否则先给每种题型 1 题，再把剩余题量按最大余数法分配。
 */
export function allocateQuestionTypeQuotas(
  types: readonly QuestionType[],
  count: number,
  weights?: Partial<Record<QuestionType, number>>,
  random: RandomSource = Math.random,
): QuestionTypeQuota[] {
  validateOptions(types, count);

  const resolvedWeights = resolveWeights(types, weights);

  if (count < types.length) {
    const available = types.map(() => true);
    const chosen = new Set<number>();

    while (chosen.size < count) {
      const index = pickWeightedIndex(
        resolvedWeights,
        available,
        random,
      );
      chosen.add(index);
      available[index] = false;
    }

    return types.map((type, index) => ({
      type,
      count: chosen.has(index) ? 1 : 0,
    }));
  }

  const base = 1;
  const remaining = count - types.length;
  const weightSum = resolvedWeights.reduce(
    (sum, weight) => sum + weight,
    0,
  );

  const rawShares = resolvedWeights.map(
    (weight) => (weight / weightSum) * remaining,
  );
  const quotas = rawShares.map(
    (share) => base + Math.floor(share),
  );

  let leftover =
    count - quotas.reduce((sum, quota) => sum + quota, 0);

  // 用洗牌后的顺序打破同余数平局，保证 seed 可复现
  const priority = shuffle(
    types.map((_, index) => index),
    random,
  );

  priority.sort((left, right) => {
    const leftFraction = rawShares[left] - Math.floor(rawShares[left]);
    const rightFraction =
      rawShares[right] - Math.floor(rawShares[right]);
    return rightFraction - leftFraction;
  });

  for (
    let index = 0;
    index < priority.length && leftover > 0;
    index += 1
  ) {
    quotas[priority[index]] += 1;
    leftover -= 1;
  }

  return types.map((type, index) => ({
    type,
    count: quotas[index],
  }));
}

/**
 * 生成题型序列：按“均匀铺开”把每种题型分散到整局中，
 * 再做热身交换。相比贪心取最大剩余，均匀铺开能避免优势题型
 * 全部堆在尾部（例如 75% 例句填空连出 5 题）。
 */
export function buildQuestionTypeSequence(
  options: BuildQuestionTypeSequenceOptions,
): QuestionType[] {
  const { types, weights, count, random = Math.random } = options;

  const quotas = allocateQuestionTypeQuotas(
    types,
    count,
    weights,
    random,
  );

  const priority = shuffle(types, random);
  const priorityIndex = new Map(
    priority.map((type, index) => [type, index]),
  );

  interface Slot {
    type: QuestionType;
    /** (k + 0.5) / quota，越靠前越先出现 */
    position: number;
    priority: number;
  }

  const slots: Slot[] = [];

  for (const quota of quotas) {
    for (let index = 0; index < quota.count; index += 1) {
      slots.push({
        type: quota.type,
        position: (index + 0.5) / quota.count,
        priority: priorityIndex.get(quota.type) ?? 0,
      });
    }
  }

  slots.sort((left, right) => {
    const positionDiff = left.position - right.position;
    if (Math.abs(positionDiff) > 1e-12) return positionDiff;
    return left.priority - right.priority;
  });

  const sequence = slots.map((slot) => slot.type);

  // 热身：把第一个基础题型换到开头；若会制造 4 连则放弃交换
  const warmupIndex = sequence.findIndex((type) =>
    WARMUP_TYPES.includes(type),
  );

  if (warmupIndex > 0) {
    const candidate = [...sequence];
    const first = candidate[0];
    candidate[0] = candidate[warmupIndex];
    candidate[warmupIndex] = first;

    if (longestTypeRun(candidate) <= 3) {
      return candidate;
    }
  }

  return sequence;
}

/** 最长连续同题型长度，供热身交换校验与测试使用 */
export function longestTypeRun(
  sequence: readonly QuestionType[],
): number {
  let run = 0;
  let longest = 0;
  let previous: QuestionType | null = null;

  for (const type of sequence) {
    run = type === previous ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = type;
  }

  return longest;
}

/** 统计序列中各题型数量，测试与调试使用 */
export function countQuestionTypes(
  sequence: readonly QuestionType[],
): Partial<Record<QuestionType, number>> {
  const counts: Partial<Record<QuestionType, number>> = {};

  for (const type of sequence) {
    counts[type] = (counts[type] ?? 0) + 1;
  }

  return counts;
}
