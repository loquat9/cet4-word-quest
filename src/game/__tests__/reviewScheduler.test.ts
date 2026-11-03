import { describe, expect, it } from 'vitest';
import type { WrongWordRecord } from '../../types';
import {
  REVIEW_INTERVAL_DAYS,
  countDueWrongWords,
  describeReviewStatus,
  getReviewIntervalDays,
  getWrongWordTargetCount,
  isReviewDue,
  scheduleAfterCorrect,
  scheduleAfterWrong,
  selectReviewCandidates,
  selectWrongWordTargets,
  sortWrongWords,
} from '../reviewScheduler';
import { toDateKey } from '../../utils/date';

const NOW = new Date(2026, 9, 26, 15, 30);

function makeWrongWord(
  overrides: Partial<WrongWordRecord> &
    Pick<WrongWordRecord, 'wordId'>,
): WrongWordRecord {
  const { wordId, ...rest } = overrides;

  return {
    wordId,
    word: wordId,
    phonetic: '/test/',
    meaning: 'v. 测试',
    chapter: 1,
    wrongCount: 1,
    lastWrongAt: new Date(2026, 9, 25, 10).toISOString(),
    nextReviewAt: new Date(2026, 9, 26).toISOString(),
    reviewStage: 0,
    ...rest,
  };
}

describe('review intervals', () => {
  it('exposes the 0 / 1 / 3 / 7 / 30 day schedule', () => {
    expect(REVIEW_INTERVAL_DAYS).toEqual([0, 1, 3, 7, 30]);
    expect(getReviewIntervalDays(0)).toBe(0);
    expect(getReviewIntervalDays(1)).toBe(1);
    expect(getReviewIntervalDays(2)).toBe(3);
    expect(getReviewIntervalDays(3)).toBe(7);
    expect(getReviewIntervalDays(4)).toBe(30);
  });
});

describe('scheduleAfterWrong', () => {
  it('resets to stage 0 and is due today', () => {
    const schedule = scheduleAfterWrong(NOW);

    expect(schedule.reviewStage).toBe(0);
    expect(toDateKey(new Date(schedule.nextReviewAt))).toBe(
      '2026-10-26',
    );
    expect(
      new Date(schedule.nextReviewAt).getHours(),
    ).toBe(0);
  });
});

describe('scheduleAfterCorrect', () => {
  it.each([
    [0, 1, '2026-10-27'],
    [1, 2, '2026-10-29'],
    [2, 3, '2026-11-02'],
    [3, 4, '2026-11-25'],
    [4, 4, '2026-11-25'],
  ])(
    'advances stage %i to %i and schedules %s',
    (currentStage, expectedStage, expectedDate) => {
      const schedule = scheduleAfterCorrect(currentStage, NOW);

      expect(schedule.reviewStage).toBe(expectedStage);
      expect(toDateKey(new Date(schedule.nextReviewAt))).toBe(
        expectedDate,
      );
    },
  );

  it('clamps negative stages before advancing', () => {
    const schedule = scheduleAfterCorrect(-3, NOW);

    expect(schedule.reviewStage).toBe(1);
    expect(toDateKey(new Date(schedule.nextReviewAt))).toBe(
      '2026-10-27',
    );
  });
});

describe('isReviewDue', () => {
  it('compares nextReviewAt with now', () => {
    expect(
      isReviewDue(
        {
          nextReviewAt: new Date(2026, 9, 25).toISOString(),
        },
        NOW,
      ),
    ).toBe(true);

    expect(
      isReviewDue(
        {
          nextReviewAt: new Date(2026, 9, 27).toISOString(),
        },
        NOW,
      ),
    ).toBe(false);

    expect(
      isReviewDue({ nextReviewAt: 'invalid' }, NOW),
    ).toBe(true);
  });

  it('counts due words', () => {
    const records = [
      makeWrongWord({
        wordId: 'a',
        nextReviewAt: new Date(2026, 9, 25).toISOString(),
      }),
      makeWrongWord({
        wordId: 'b',
        nextReviewAt: new Date(2026, 9, 26).toISOString(),
      }),
      makeWrongWord({
        wordId: 'c',
        nextReviewAt: new Date(2026, 9, 28).toISOString(),
      }),
    ];

    expect(countDueWrongWords(records, NOW)).toBe(2);
  });
});

describe('describeReviewStatus', () => {
  it('describes due and upcoming states', () => {
    expect(
      describeReviewStatus(
        {
          reviewStage: 0,
          nextReviewAt: new Date(2026, 9, 26).toISOString(),
        },
        NOW,
      ),
    ).toBe('今天复习');

    expect(
      describeReviewStatus(
        {
          reviewStage: 4,
          nextReviewAt: new Date(2026, 9, 26).toISOString(),
        },
        NOW,
      ),
    ).toBe('待抽查');

    expect(
      describeReviewStatus(
        {
          reviewStage: 1,
          nextReviewAt: new Date(2026, 9, 27).toISOString(),
        },
        NOW,
      ),
    ).toBe('明天复习');

    expect(
      describeReviewStatus(
        {
          reviewStage: 2,
          nextReviewAt: new Date(2026, 9, 29).toISOString(),
        },
        NOW,
      ),
    ).toBe('3 天后复习');

    expect(
      describeReviewStatus(
        {
          reviewStage: 4,
          nextReviewAt: new Date(2026, 10, 25).toISOString(),
        },
        NOW,
      ),
    ).toBe('已掌握 · 30 天后抽查');
  });
});

describe('sortWrongWords', () => {
  it('sorts by wrongCount then latest wrong time', () => {
    const records = [
      makeWrongWord({
        wordId: 'one',
        wrongCount: 1,
        lastWrongAt: new Date(2026, 9, 26).toISOString(),
      }),
      makeWrongWord({
        wordId: 'three',
        wrongCount: 3,
        lastWrongAt: new Date(2026, 9, 20).toISOString(),
      }),
      makeWrongWord({
        wordId: 'two-old',
        wrongCount: 2,
        lastWrongAt: new Date(2026, 9, 21).toISOString(),
      }),
      makeWrongWord({
        wordId: 'two-new',
        wrongCount: 2,
        lastWrongAt: new Date(2026, 9, 25).toISOString(),
      }),
    ];

    expect(
      sortWrongWords(records).map((record) => record.wordId),
    ).toEqual(['three', 'two-new', 'two-old', 'one']);
  });
});

describe('selectReviewCandidates', () => {
  it('puts due words first, ordered by stage and wrong count', () => {
    const records = [
      makeWrongWord({
        wordId: 'upcoming',
        wrongCount: 9,
        nextReviewAt: new Date(2026, 9, 27).toISOString(),
      }),
      makeWrongWord({
        wordId: 'due-stage-1',
        reviewStage: 1,
        wrongCount: 1,
        nextReviewAt: new Date(2026, 9, 25).toISOString(),
      }),
      makeWrongWord({
        wordId: 'due-stage-0',
        reviewStage: 0,
        wrongCount: 2,
        nextReviewAt: new Date(2026, 9, 26).toISOString(),
      }),
    ];

    const selected = selectReviewCandidates(records, 2, NOW);

    expect(selected.map((record) => record.wordId)).toEqual([
      'due-stage-0',
      'due-stage-1',
    ]);
  });

  it('fills remaining slots with the nearest upcoming words', () => {
    const records = [
      makeWrongWord({
        wordId: 'later',
        nextReviewAt: new Date(2026, 9, 30).toISOString(),
      }),
      makeWrongWord({
        wordId: 'soon',
        nextReviewAt: new Date(2026, 9, 27).toISOString(),
      }),
      makeWrongWord({
        wordId: 'due',
        nextReviewAt: new Date(2026, 9, 25).toISOString(),
      }),
    ];

    expect(
      selectReviewCandidates(records, 3, NOW).map(
        (record) => record.wordId,
      ),
    ).toEqual(['due', 'soon', 'later']);
  });
});

describe('wrong-word targets for normal levels', () => {
  it('filters by chapter and puts due words first', () => {
    const records = [
      makeWrongWord({
        wordId: 'chapter-2-due',
        chapter: 2,
        nextReviewAt: new Date(2026, 9, 25).toISOString(),
      }),
      makeWrongWord({
        wordId: 'chapter-1-upcoming',
        chapter: 1,
        wrongCount: 9,
        nextReviewAt: new Date(2026, 9, 30).toISOString(),
      }),
      makeWrongWord({
        wordId: 'chapter-1-due',
        chapter: 1,
        wrongCount: 1,
        nextReviewAt: new Date(2026, 9, 25).toISOString(),
      }),
    ];

    expect(
      selectWrongWordTargets(records, 1, 2, NOW).map(
        (record) => record.wordId,
      ),
    ).toEqual(['chapter-1-due', 'chapter-1-upcoming']);
  });

  it('computes 30 percent of the question count', () => {
    expect(getWrongWordTargetCount(12)).toBe(3);
    expect(getWrongWordTargetCount(15)).toBe(4);
    expect(getWrongWordTargetCount(18)).toBe(5);
    expect(getWrongWordTargetCount(0)).toBe(0);
  });
});
