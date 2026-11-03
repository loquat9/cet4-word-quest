import { describe, expect, it } from 'vitest';
import { createSeededRandom, shuffle } from '../../utils/random';

describe('createSeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const first = createSeededRandom(2026);
    const second = createSeededRandom(2026);

    const firstValues = Array.from({ length: 8 }, () => first());
    const secondValues = Array.from({ length: 8 }, () => second());

    expect(secondValues).toEqual(firstValues);
  });

  it('produces different sequences for different seeds', () => {
    const first = createSeededRandom(1);
    const second = createSeededRandom(2);

    const firstValues = Array.from({ length: 8 }, () => first());
    const secondValues = Array.from({ length: 8 }, () => second());

    expect(secondValues).not.toEqual(firstValues);
  });

  it('always returns values in [0, 1)', () => {
    const random = createSeededRandom(0);

    for (let index = 0; index < 100; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('does not mutate the original array', () => {
    const items = [1, 2, 3, 4, 5];
    const original = [...items];

    shuffle(items, createSeededRandom(10));

    expect(items).toEqual(original);
  });

  it('is deterministic with the same seed', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];

    const first = shuffle(items, createSeededRandom(99));
    const second = shuffle(items, createSeededRandom(99));

    expect(second).toEqual(first);
    expect(new Set(first)).toEqual(new Set(items));
  });
});
