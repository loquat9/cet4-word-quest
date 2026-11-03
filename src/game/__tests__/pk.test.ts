import { describe, expect, it } from 'vitest';
import {
  PK_CODE_ALPHABET,
  PK_CODE_LENGTH,
  comparePkResults,
  createPkSeed,
  decodePkCode,
  encodePkCode,
  getPkAccuracy,
  normalizePkCode,
  type PkResultSnapshot,
} from '../../services/pk';

const VALID_CODE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;

function snapshot(
  overrides: Partial<PkResultSnapshot> = {},
): PkResultSnapshot {
  return {
    seed: 1234,
    correctCount: 10,
    answeredCount: 12,
    durationSec: 87,
    ...overrides,
  };
}

describe('PK code encoding', () => {
  it('produces six characters from the Base32 alphabet', () => {
    const code = encodePkCode(snapshot());

    expect(code).toHaveLength(PK_CODE_LENGTH);
    expect(code).toMatch(VALID_CODE);

    for (const character of code) {
      expect(PK_CODE_ALPHABET).toContain(character);
    }
  });

  it.each([
    { seed: 0, correctCount: 0, answeredCount: 1, durationSec: 0 },
    { seed: 1, correctCount: 1, answeredCount: 1, durationSec: 1 },
    {
      seed: 2047,
      correctCount: 12,
      answeredCount: 12,
      durationSec: 300,
    },
    {
      seed: 1024,
      correctCount: 31,
      answeredCount: 31,
      durationSec: 300,
    },
    {
      seed: 777,
      correctCount: 5,
      answeredCount: 12,
      durationSec: 123,
    },
  ])('round-trips %o', (input) => {
    const code = encodePkCode(input);
    const decoded = decodePkCode(code);

    expect(decoded).toEqual(input);
  });

  it('normalizes lowercase, spaces and hyphens', () => {
    const code = encodePkCode(snapshot());
    const messy = `${code.slice(0, 2)}-${code
      .slice(2, 4)
      .toLowerCase()} ${code.slice(4).toLowerCase()}`;

    expect(normalizePkCode(messy)).toBe(code);
    expect(decodePkCode(messy)).toEqual(snapshot());
  });

  it('rejects invalid lengths and characters', () => {
    expect(decodePkCode('')).toBeNull();
    expect(decodePkCode('ABC')).toBeNull();
    expect(decodePkCode('000000')).toBeNull();
    expect(decodePkCode('OOOOOO')).toBeNull();
    expect(decodePkCode('111111')).toBeNull();
    expect(decodePkCode('ZZZZZZ')).toBeNull();
  });

  it('rejects the all-zero payload because it has no answers', () => {
    expect(decodePkCode('222222')).toBeNull();
  });

  it('rejects out-of-range values when encoding', () => {
    expect(() =>
      encodePkCode(snapshot({ seed: 2048 })),
    ).toThrow(RangeError);

    expect(() =>
      encodePkCode(snapshot({ durationSec: 301 })),
    ).toThrow(RangeError);

    expect(() =>
      encodePkCode(
        snapshot({ correctCount: 13, answeredCount: 12 }),
      ),
    ).toThrow(RangeError);

    expect(() =>
      encodePkCode(snapshot({ answeredCount: 0, correctCount: 0 })),
    ).toThrow(RangeError);

    expect(() =>
      encodePkCode(snapshot({ correctCount: -1 })),
    ).toThrow(RangeError);
  });

  it('creates seeds inside the 11-bit range', () => {
    expect(createPkSeed(() => 0)).toBe(0);
    expect(createPkSeed(() => 0.5)).toBe(1024);
    expect(createPkSeed(() => 0.999999)).toBe(2047);
  });
});

describe('PK result comparison', () => {
  it('wins on higher accuracy', () => {
    const comparison = comparePkResults(
      snapshot({ correctCount: 10 }),
      snapshot({ correctCount: 9 }),
    );

    expect(comparison.outcome).toBe('win');
    expect(comparison.playerAccuracy).toBeGreaterThan(
      comparison.targetAccuracy,
    );
  });

  it('loses on lower accuracy', () => {
    expect(
      comparePkResults(
        snapshot({ correctCount: 8 }),
        snapshot({ correctCount: 11 }),
      ).outcome,
    ).toBe('lose');
  });

  it('breaks equal accuracy by shorter duration', () => {
    const player = snapshot({
      correctCount: 8,
      answeredCount: 12,
      durationSec: 100,
    });
    const target = snapshot({
      correctCount: 4,
      answeredCount: 6,
      durationSec: 120,
    });

    expect(comparePkResults(player, target).outcome).toBe('win');

    expect(
      comparePkResults(
        { ...player, durationSec: 130 },
        target,
      ).outcome,
    ).toBe('lose');

    expect(
      comparePkResults(
        { ...player, durationSec: 120 },
        target,
      ).outcome,
    ).toBe('draw');
  });

  it('reports both sides for the result panel', () => {
    const comparison = comparePkResults(
      snapshot({
        correctCount: 9,
        answeredCount: 12,
        durationSec: 90,
      }),
      snapshot({
        correctCount: 10,
        answeredCount: 12,
        durationSec: 80,
      }),
    );

    expect(comparison).toMatchObject({
      outcome: 'lose',
      playerCorrect: 9,
      playerAnswered: 12,
      targetCorrect: 10,
      targetAnswered: 12,
      playerDurationSec: 90,
      targetDurationSec: 80,
    });
  });

  it('computes accuracy with a safe zero-answer fallback', () => {
    expect(getPkAccuracy({ correctCount: 0, answeredCount: 0 })).toBe(0);
    expect(getPkAccuracy({ correctCount: 3, answeredCount: 4 })).toBe(
      0.75,
    );
  });
});
