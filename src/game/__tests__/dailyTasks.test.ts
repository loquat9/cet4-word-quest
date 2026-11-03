import { describe, expect, it } from 'vitest';
import type { DailyTaskProgress } from '../../types';
import {
  DAILY_TASKS,
  getDailyTask,
} from '../../data/dailyTasks';
import {
  addDailyTaskProgress,
  canClaimDailyTask,
  claimDailyTask,
  createDailyTask,
  getClaimableCoins,
  getClaimableTaskIds,
  getDailyTaskProgress,
  isDailyTaskComplete,
  normalizeDailyTask,
} from '../dailyTasks';

const TODAY = '2026-10-26';
const YESTERDAY = '2026-10-25';

function task(
  overrides: Partial<DailyTaskProgress> = {},
): DailyTaskProgress {
  return {
    ...createDailyTask(TODAY),
    ...overrides,
  };
}

describe('daily task definitions', () => {
  it('defines the three tasks with agreed targets and rewards', () => {
    expect(DAILY_TASKS.map((definition) => definition.id)).toEqual([
      'learn-new',
      'review-wrong',
      'play-game',
    ]);
    expect(getDailyTask('learn-new')?.target).toBe(10);
    expect(getDailyTask('review-wrong')?.target).toBe(20);
    expect(getDailyTask('play-game')?.target).toBe(1);
    expect(getDailyTask('learn-new')?.rewardCoins).toBe(20);
    expect(getDailyTask('review-wrong')?.rewardCoins).toBe(30);
    expect(getDailyTask('play-game')?.rewardCoins).toBe(10);
  });
});

describe('normalizeDailyTask', () => {
  it('creates an empty task for a new date', () => {
    const normalized = normalizeDailyTask(
      task({
        date: YESTERDAY,
        newWordsLearned: 8,
        gamesPlayed: 2,
        reviewedWordIds: ['a'],
      }),
      TODAY,
    );

    expect(normalized).toEqual(createDailyTask(TODAY));
  });

  it('keeps counts for the same date and de-duplicates ids', () => {
    const normalized = normalizeDailyTask(
      task({
        newWordsLearned: 3,
        gamesPlayed: 1,
        reviewedWordIds: ['a', 'a', 'b'],
        claimedTaskIds: ['play-game', 'play-game'],
      }),
      TODAY,
    );

    expect(normalized.newWordsLearned).toBe(3);
    expect(normalized.gamesPlayed).toBe(1);
    expect(normalized.reviewedWordIds).toEqual(['a', 'b']);
    expect(normalized.wrongWordsReviewed).toBe(2);
    expect(normalized.claimedTaskIds).toEqual(['play-game']);
  });

  it('adds missing reviewedWordIds for legacy data', () => {
    const legacy = {
      date: TODAY,
      newWordsLearned: 2,
      wrongWordsReviewed: 5,
      gamesPlayed: 1,
      claimedTaskIds: [],
    } as unknown as DailyTaskProgress;

    const normalized = normalizeDailyTask(legacy, TODAY);

    expect(normalized.reviewedWordIds).toEqual([]);
    expect(normalized.wrongWordsReviewed).toBe(0);
  });

  it('clamps negative and fractional counts', () => {
    const normalized = normalizeDailyTask(
      task({
        newWordsLearned: -3,
        gamesPlayed: 2.9,
        reviewedWordIds: ['a'],
      }),
      TODAY,
    );

    expect(normalized.newWordsLearned).toBe(0);
    expect(normalized.gamesPlayed).toBe(2);
  });
});

describe('addDailyTaskProgress', () => {
  it('adds new words and games', () => {
    const next = addDailyTaskProgress(
      task(),
      { newWords: 4, games: 1 },
      TODAY,
    );

    expect(next.newWordsLearned).toBe(4);
    expect(next.gamesPlayed).toBe(1);
  });

  it('counts reviewed wrong words once per day', () => {
    const first = addDailyTaskProgress(
      task(),
      { reviewedWordIds: ['a', 'b', 'a'] },
      TODAY,
    );
    const second = addDailyTaskProgress(
      first,
      { reviewedWordIds: ['b', 'c'] },
      TODAY,
    );

    expect(second.reviewedWordIds).toEqual(['a', 'b', 'c']);
    expect(second.wrongWordsReviewed).toBe(3);
  });

  it('resets when the day changes before adding', () => {
    const next = addDailyTaskProgress(
      task({ date: YESTERDAY, newWordsLearned: 9 }),
      { newWords: 2, games: 1 },
      TODAY,
    );

    expect(next.date).toBe(TODAY);
    expect(next.newWordsLearned).toBe(2);
    expect(next.gamesPlayed).toBe(1);
  });

  it('ignores negative patch values', () => {
    const next = addDailyTaskProgress(
      task({ newWordsLearned: 5 }),
      { newWords: -2, games: -1 },
      TODAY,
    );

    expect(next.newWordsLearned).toBe(5);
    expect(next.gamesPlayed).toBe(0);
  });
});

describe('daily task completion and claims', () => {
  it('detects completion from each metric', () => {
    const learn = getDailyTask('learn-new');
    const review = getDailyTask('review-wrong');
    const play = getDailyTask('play-game');

    expect(learn).toBeDefined();
    expect(review).toBeDefined();
    expect(play).toBeDefined();

    expect(
      isDailyTaskComplete(
        task({ newWordsLearned: 10 }),
        learn!,
      ),
    ).toBe(true);
    expect(
      isDailyTaskComplete(task({ newWordsLearned: 9 }), learn!),
    ).toBe(false);

    expect(
      isDailyTaskComplete(
        task({ reviewedWordIds: Array.from({ length: 20 }, (_, i) => `w${i}`), wrongWordsReviewed: 20 }),
        review!,
      ),
    ).toBe(true);

    expect(
      isDailyTaskComplete(task({ gamesPlayed: 1 }), play!),
    ).toBe(true);
  });

  it('claims once and returns the reward', () => {
    const definition = getDailyTask('learn-new')!;
    const current = task({ newWordsLearned: 10 });

    expect(canClaimDailyTask(current, definition)).toBe(true);

    const claimed = claimDailyTask(current, definition, TODAY);

    expect(claimed?.coins).toBe(20);
    expect(claimed?.task.claimedTaskIds).toContain('learn-new');

    expect(
      claimDailyTask(claimed?.task, definition, TODAY),
    ).toBeNull();
  });

  it('does not claim incomplete tasks', () => {
    const definition = getDailyTask('review-wrong')!;

    expect(
      claimDailyTask(task({ reviewedWordIds: [] }), definition, TODAY),
    ).toBeNull();
  });

  it('sums claimable coins and ids', () => {
    const current = task({
      newWordsLearned: 10,
      reviewedWordIds: Array.from(
        { length: 20 },
        (_, index) => `word-${index}`,
      ),
      wrongWordsReviewed: 20,
      gamesPlayed: 1,
    });

    expect(getClaimableCoins(current)).toBe(60);
    expect(getClaimableTaskIds(current)).toEqual([
      'learn-new',
      'review-wrong',
      'play-game',
    ]);
  });

  it('exposes progress through the definition metric', () => {
    const current = task({
      newWordsLearned: 7,
      gamesPlayed: 1,
    });

    expect(
      getDailyTaskProgress(current, getDailyTask('learn-new')!),
    ).toBe(7);
    expect(
      getDailyTaskProgress(current, getDailyTask('play-game')!),
    ).toBe(1);
  });
});
