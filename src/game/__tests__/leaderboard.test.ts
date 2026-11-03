import { describe, expect, it } from 'vitest';
import type {
  LeaderboardEntry,
  LeaderboardRow,
  StarRating,
} from '../../types';
import { createDefaultProgress } from '../../services/storage/defaults';
import {
  buildLocalAllTimeRow,
  buildLocalWeeklyRow,
  buildMockLeaderboardRows,
  mergeLeaderboardRows,
  rankLeaderboardRows,
  sortLeaderboardRows,
} from '../leaderboard';

const WEEK = '2026-10-26';

function makeEntry(
  overrides: Partial<LeaderboardEntry> &
    Pick<LeaderboardEntry, 'id'>,
): LeaderboardEntry {
  const { id, ...rest } = overrides;

  return {
    id,
    playerId: 'local',
    playerName: '我',
    levelId: 'c1-l1',
    stars: 1 as StarRating,
    accuracy: 0.5,
    durationSec: 100,
    score: 5,
    playedAt: new Date(2026, 9, 26, 10).toISOString(),
    weekKey: WEEK,
    isMock: false,
    correctCount: 1,
    answeredCount: 2,
    streakDays: 1,
    ...rest,
  };
}

function makeRow(
  overrides: Partial<LeaderboardRow> &
    Pick<LeaderboardRow, 'playerId'>,
): LeaderboardRow {
  const { playerId, ...rest } = overrides;

  return {
    playerId,
    playerName: playerId,
    stars: 0,
    accuracy: 0,
    streakDays: 0,
    games: 0,
    isMock: false,
    isLocal: false,
    rank: 0,
    ...rest,
  };
}

describe('sortLeaderboardRows', () => {
  it('sorts by stars, accuracy, streak and name', () => {
    const rows = [
      makeRow({
        playerId: 'a',
        playerName: 'A',
        stars: 10,
        accuracy: 0.8,
        streakDays: 5,
      }),
      makeRow({
        playerId: 'b',
        playerName: 'B',
        stars: 10,
        accuracy: 0.9,
        streakDays: 3,
      }),
      makeRow({
        playerId: 'c',
        playerName: 'C',
        stars: 10,
        accuracy: 0.9,
        streakDays: 4,
      }),
      makeRow({
        playerId: 'd',
        playerName: 'Alice',
        stars: 10,
        accuracy: 0.9,
        streakDays: 4,
      }),
      makeRow({
        playerId: 'e',
        playerName: 'E',
        stars: 20,
        accuracy: 0.5,
        streakDays: 1,
      }),
    ];

    expect(
      sortLeaderboardRows(rows).map((row) => row.playerId),
    ).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('does not mutate the input', () => {
    const rows = [
      makeRow({ playerId: 'a', stars: 1 }),
      makeRow({ playerId: 'b', stars: 2 }),
    ];
    const original = [...rows];

    sortLeaderboardRows(rows);

    expect(rows).toEqual(original);
  });
});

describe('rankLeaderboardRows', () => {
  it('assigns sequential ranks after sorting', () => {
    const ranked = rankLeaderboardRows([
      makeRow({ playerId: 'a', stars: 5 }),
      makeRow({ playerId: 'b', stars: 9 }),
      makeRow({ playerId: 'c', stars: 7 }),
    ]);

    expect(ranked.map((row) => row.playerId)).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 3]);
  });
});

describe('mock leaderboard', () => {
  it('always provides eight friends for both ranges', () => {
    expect(buildMockLeaderboardRows('week', WEEK)).toHaveLength(8);
    expect(buildMockLeaderboardRows('all', WEEK)).toHaveLength(8);
  });

  it('generates the same weekly rows for the same week', () => {
    expect(
      buildMockLeaderboardRows('week', WEEK),
    ).toEqual(buildMockLeaderboardRows('week', WEEK));
  });

  it('changes weekly rows for another week', () => {
    expect(
      buildMockLeaderboardRows('week', '2026-11-02'),
    ).not.toEqual(buildMockLeaderboardRows('week', WEEK));
  });

  it('keeps all-time rows independent of the week key', () => {
    expect(
      buildMockLeaderboardRows('all', '2026-10-26'),
    ).toEqual(buildMockLeaderboardRows('all', '2026-11-02'));
  });
});

describe('buildLocalWeeklyRow', () => {
  it('aggregates current-week entries with weighted accuracy', () => {
    const entries = [
      makeEntry({
        id: '1',
        stars: 3,
        correctCount: 1,
        answeredCount: 2,
        accuracy: 0.5,
        streakDays: 2,
      }),
      makeEntry({
        id: '2',
        stars: 2,
        correctCount: 2,
        answeredCount: 2,
        accuracy: 1,
        streakDays: 4,
      }),
      makeEntry({
        id: 'other-week',
        weekKey: '2026-10-19',
        stars: 3,
      }),
      makeEntry({
        id: 'mock',
        isMock: true,
        stars: 3,
      }),
    ];

    const row = buildLocalWeeklyRow(entries, WEEK);

    expect(row).not.toBeNull();
    expect(row?.stars).toBe(5);
    expect(row?.accuracy).toBe(0.75);
    expect(row?.streakDays).toBe(4);
    expect(row?.games).toBe(2);
    expect(row?.isLocal).toBe(true);
  });

  it('returns null when there is no entry for the week', () => {
    expect(
      buildLocalWeeklyRow(
        [makeEntry({ id: 'old', weekKey: '2026-10-19' })],
        WEEK,
      ),
    ).toBeNull();
  });
});

describe('buildLocalAllTimeRow', () => {
  it('uses best stars and overall weighted accuracy', () => {
    const progress = {
      ...createDefaultProgress(),
      learnedWordIds: ['cet4_0001'],
      totalAnswered: 4,
      totalCorrect: 3,
      streakDays: 5,
      levelProgress: {
        'c1-l1': {
          levelId: 'c1-l1',
          stars: 3 as StarRating,
          bestAccuracy: 0.9,
          bestTimeSec: 100,
          completedAt: new Date(2026, 9, 26).toISOString(),
        },
        'c2-l1': {
          levelId: 'c2-l1',
          stars: 2 as StarRating,
          bestAccuracy: 0.8,
          bestTimeSec: 120,
          completedAt: new Date(2026, 9, 26).toISOString(),
        },
      },
    };

    const row = buildLocalAllTimeRow(progress, 3);

    expect(row).not.toBeNull();
    expect(row?.stars).toBe(5);
    expect(row?.accuracy).toBe(0.75);
    expect(row?.streakDays).toBe(5);
    expect(row?.games).toBe(3);
    expect(row?.isLocal).toBe(true);
  });

  it('returns null for a player without activity', () => {
    expect(
      buildLocalAllTimeRow(createDefaultProgress(), 0),
    ).toBeNull();
  });
});

describe('mergeLeaderboardRows', () => {
  it('merges and ranks local and mock rows', () => {
    const local = makeRow({
      playerId: 'local',
      playerName: '我',
      stars: 100,
      isLocal: true,
    });
    const mocks = buildMockLeaderboardRows('week', WEEK);

    const merged = mergeLeaderboardRows(mocks, [local]);

    expect(merged).toHaveLength(9);
    expect(merged[0].playerId).toBe('local');
    expect(merged.map((row) => row.rank)).toEqual(
      Array.from({ length: 9 }, (_, index) => index + 1),
    );
  });
});
