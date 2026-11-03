/**
 * 好友 PK 对战码。
 *
 * 6 位 Base32 编码 30 bit：
 * - seed: 11 bit（0—2047）
 * - correctCount: 5 bit（0—31）
 * - answeredCount: 5 bit（0—31）
 * - durationSec: 9 bit（0—511，实际限制 300）
 *
 * 字母表去掉 0 / O / 1 / I，避免口头与截图误读。
 */

export const PK_CODE_LENGTH = 6;
export const PK_CODE_ALPHABET =
  '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const PK_SEED_MAX = 2047;
export const PK_QUESTION_COUNT = 12;
export const PK_TIME_LIMIT_SEC = 300;

export interface PkResultSnapshot {
  seed: number;
  correctCount: number;
  answeredCount: number;
  durationSec: number;
}

export type PkChallenge = PkResultSnapshot;

export type PkOutcome = 'win' | 'lose' | 'draw';

export interface PkComparison {
  outcome: PkOutcome;
  playerAccuracy: number;
  targetAccuracy: number;
  playerDurationSec: number;
  targetDurationSec: number;
  playerCorrect: number;
  playerAnswered: number;
  targetCorrect: number;
  targetAnswered: number;
}

export interface PKService {
  createSeed(): number;
  encode(snapshot: PkResultSnapshot): string;
  decode(code: string): PkChallenge | null;
  compare(
    player: PkResultSnapshot,
    target: PkChallenge,
  ): PkComparison;
}

function assertInteger(
  value: number,
  min: number,
  max: number,
  label: string,
): void {
  if (
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new RangeError(
      `${label} 必须是 ${min}—${max} 的整数，收到：${String(value)}`,
    );
  }
}

export function normalizePkCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, '');
}

export function encodePkCode(snapshot: PkResultSnapshot): string {
  assertInteger(snapshot.seed, 0, PK_SEED_MAX, 'seed');
  assertInteger(
    snapshot.correctCount,
    0,
    31,
    'correctCount',
  );
  assertInteger(
    snapshot.answeredCount,
    1,
    31,
    'answeredCount',
  );
  assertInteger(
    snapshot.durationSec,
    0,
    PK_TIME_LIMIT_SEC,
    'durationSec',
  );

  if (snapshot.correctCount > snapshot.answeredCount) {
    throw new RangeError('correctCount 不能大于 answeredCount');
  }

  let payload =
    (snapshot.seed << 19) |
    (snapshot.correctCount << 14) |
    (snapshot.answeredCount << 9) |
    snapshot.durationSec;

  let code = '';

  for (let index = 0; index < PK_CODE_LENGTH; index += 1) {
    const symbol =
      PK_CODE_ALPHABET[payload % PK_CODE_ALPHABET.length];
    code = symbol + code;
    payload = Math.floor(payload / PK_CODE_ALPHABET.length);
  }

  return code;
}

export function decodePkCode(code: string): PkChallenge | null {
  const normalized = normalizePkCode(code);

  if (normalized.length !== PK_CODE_LENGTH) return null;

  let payload = 0;

  for (const character of normalized) {
    const index = PK_CODE_ALPHABET.indexOf(character);
    if (index < 0) return null;
    payload = payload * PK_CODE_ALPHABET.length + index;
  }

  const durationSec = payload & 0x1ff;
  const answeredCount = (payload >>> 9) & 0x1f;
  const correctCount = (payload >>> 14) & 0x1f;
  const seed = (payload >>> 19) & 0x7ff;

  if (answeredCount === 0) return null;
  if (correctCount > answeredCount) return null;
  if (durationSec > PK_TIME_LIMIT_SEC) return null;
  if (seed > PK_SEED_MAX) return null;

  return {
    seed,
    correctCount,
    answeredCount,
    durationSec,
  };
}

export function getPkAccuracy(
  snapshot: Pick<
    PkResultSnapshot,
    'correctCount' | 'answeredCount'
  >,
): number {
  if (snapshot.answeredCount <= 0) return 0;
  return Math.min(
    1,
    Math.max(0, snapshot.correctCount / snapshot.answeredCount),
  );
}

/**
 * 正确率优先；相同则用时更短者胜；仍相同为平局。
 */
export function comparePkResults(
  player: PkResultSnapshot,
  target: PkChallenge,
): PkComparison {
  const playerAccuracy = getPkAccuracy(player);
  const targetAccuracy = getPkAccuracy(target);
  const epsilon = 1e-9;

  let outcome: PkOutcome;

  if (playerAccuracy - targetAccuracy > epsilon) {
    outcome = 'win';
  } else if (targetAccuracy - playerAccuracy > epsilon) {
    outcome = 'lose';
  } else if (player.durationSec < target.durationSec) {
    outcome = 'win';
  } else if (player.durationSec > target.durationSec) {
    outcome = 'lose';
  } else {
    outcome = 'draw';
  }

  return {
    outcome,
    playerAccuracy,
    targetAccuracy,
    playerDurationSec: player.durationSec,
    targetDurationSec: target.durationSec,
    playerCorrect: player.correctCount,
    playerAnswered: player.answeredCount,
    targetCorrect: target.correctCount,
    targetAnswered: target.answeredCount,
  };
}

export function createPkSeed(
  random: () => number = Math.random,
): number {
  return Math.floor(random() * (PK_SEED_MAX + 1));
}

export const localPKService: PKService = {
  createSeed: createPkSeed,
  encode: encodePkCode,
  decode: decodePkCode,
  compare: comparePkResults,
};
