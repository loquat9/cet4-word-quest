import { describe, expect, it } from 'vitest';
import type { QuestionType } from '../../types';
import {
  allocateQuestionTypeQuotas,
  buildQuestionTypeSequence,
  countQuestionTypes,
  QuestionMixError,
} from '../questionMix';

const ALL_FIVE: QuestionType[] = [
  'word-to-meaning',
  'meaning-to-word',
  'listen-to-word',
  'example-fill',
  'dictation',
];

function longestRun(sequence: readonly QuestionType[]): number {
  let run = 1;
  let maxRun = 1;

  for (let index = 1; index < sequence.length; index += 1) {
    run = sequence[index] === sequence[index - 1] ? run + 1 : 1;
    maxRun = Math.max(maxRun, run);
  }

  return maxRun;
}

describe('allocateQuestionTypeQuotas', () => {
  it('covers every type and sums to the requested count', () => {
    const quotas = allocateQuestionTypeQuotas(
      ALL_FIVE,
      12,
      undefined,
      () => 0.42,
    );

    expect(quotas).toHaveLength(5);
    expect(
      quotas.reduce((sum, quota) => sum + quota.count, 0),
    ).toBe(12);

    for (const quota of quotas) {
      expect(quota.count).toBeGreaterThanOrEqual(2);
    }
  });

  it('honours the 70 / 30 chapter weights', () => {
    const quotas = allocateQuestionTypeQuotas(
      ['dictation', 'listen-to-word'],
      12,
      { dictation: 0.7, 'listen-to-word': 0.3 },
    );

    const counts = Object.fromEntries(
      quotas.map((quota) => [quota.type, quota.count]),
    );

    expect(counts).toEqual({
      dictation: 8,
      'listen-to-word': 4,
    });
  });

  it('samples distinct types when count is smaller than the type list', () => {
    const quotas = allocateQuestionTypeQuotas(
      ALL_FIVE,
      2,
      undefined,
      () => 0.1,
    );

    expect(
      quotas.reduce((sum, quota) => sum + quota.count, 0),
    ).toBe(2);
    expect(
      quotas.filter((quota) => quota.count === 1),
    ).toHaveLength(2);
  });

  it('falls back to uniform weights when every weight is zero', () => {
    const quotas = allocateQuestionTypeQuotas(
      ['dictation', 'listen-to-word'],
      12,
      { dictation: 0, 'listen-to-word': 0 },
      () => 0.5,
    );

    expect(
      quotas.reduce((sum, quota) => sum + quota.count, 0),
    ).toBe(12);
    expect(quotas[0].count).toBe(6);
    expect(quotas[1].count).toBe(6);
  });

  it('rejects empty type lists and invalid counts', () => {
    expect(() => allocateQuestionTypeQuotas([], 1)).toThrow(
      QuestionMixError,
    );
    expect(() =>
      allocateQuestionTypeQuotas(ALL_FIVE, 0),
    ).toThrow(QuestionMixError);
    expect(() =>
      allocateQuestionTypeQuotas(
        ['dictation', 'dictation'],
        2,
      ),
    ).toThrow(QuestionMixError);
  });
});

describe('buildQuestionTypeSequence', () => {
  it('produces exactly count items matching the quota distribution', () => {
    const sequence = buildQuestionTypeSequence({
      types: ['example-fill', 'meaning-to-word'],
      weights: { 'example-fill': 0.75, 'meaning-to-word': 0.25 },
      count: 12,
      random: () => 0.3,
    });

    expect(sequence).toHaveLength(12);

    const counts = countQuestionTypes(sequence);
    expect(counts['example-fill']).toBeGreaterThanOrEqual(8);
    expect(counts['meaning-to-word']).toBeGreaterThanOrEqual(3);
    expect(
      (counts['example-fill'] ?? 0) >
        (counts['meaning-to-word'] ?? 0),
    ).toBe(true);
  });

  it('starts with a warm-up type when one is available', () => {
    const sequence = buildQuestionTypeSequence({
      types: ['listen-to-word', 'word-to-meaning', 'meaning-to-word'],
      weights: {
        'word-to-meaning': 0.35,
        'meaning-to-word': 0.35,
        'listen-to-word': 0.3,
      },
      count: 12,
    });

    expect([
      'word-to-meaning',
      'meaning-to-word',
    ]).toContain(sequence[0]);
  });

  it('avoids long runs of the same type', () => {
    const sequence = buildQuestionTypeSequence({
      types: ['example-fill', 'meaning-to-word'],
      weights: { 'example-fill': 0.75, 'meaning-to-word': 0.25 },
      count: 12,
      random: () => 0.9,
    });

    expect(longestRun(sequence)).toBeLessThanOrEqual(3);
  });

  it('is deterministic for the same random source', () => {
    const options = {
      types: ALL_FIVE,
      count: 12,
      random: () => 0.37,
    };

    expect(
      buildQuestionTypeSequence(options),
    ).toEqual(buildQuestionTypeSequence(options));
  });

  it('uses the only available type for every question', () => {
    const sequence = buildQuestionTypeSequence({
      types: ['dictation'],
      count: 6,
    });

    expect(sequence).toEqual(Array(6).fill('dictation'));
  });
});
