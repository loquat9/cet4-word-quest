import type {
  LeaderboardEntry,
  LeaderboardRange,
  LeaderboardRow,
  PlayerProgress,
} from '../types';
import { MOCK_FRIENDS } from '../data/mockFriends';
import { getWeekKey } from '../utils/date';
import { createSeededRandom } from '../utils/random';
import {
  calculateAccuracy,
  computeLearningStats,
} from './learningStats';

/**
 * 排行榜纯逻辑：聚合、排序、模拟好友生成。
 * 不访问存储，便于单测；服务层负责读写。
 */

const LOCAL_PLAYER_ID = 'local';
const LOCAL_PLAYER_NAME = '我';

/** FNV-1a 32 位字符串哈希，用于模拟好友的确定性周榜 */
export function hashStringToSeed(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function sortLeaderboardRows(
  rows: readonly LeaderboardRow[],
): LeaderboardRow[] {
  return [...rows].sort((left, right) => {
    if (right.stars !== left.stars) {
      return right.stars - left.stars;
    }

    if (right.accuracy !== left.accuracy) {
      return right.accuracy - left.accuracy;
    }

    if (right.streakDays !== left.streakDays) {
      return right.streakDays - left.streakDays;
    }

    const nameDiff = left.playerName.localeCompare(
      right.playerName,
      'zh-CN',
    );
    if (nameDiff !== 0) return nameDiff;

    return left.playerId.localeCompare(right.playerId);
  });
}

export function rankLeaderboardRows(
  rows: readonly LeaderboardRow[],
): LeaderboardRow[] {
  return sortLeaderboardRows(rows).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

/**
 * 模拟好友行。
 * 总榜使用静态值；周榜按 weekKey + friend.id 确定性生成。
 */
export function buildMockLeaderboardRows(
  range: LeaderboardRange,
  weekKey: string = getWeekKey(),
): LeaderboardRow[] {
  return MOCK_FRIENDS.map((friend) => {
    if (range === 'all') {
      return {
        playerId: `mock:${friend.id}`,
        playerName: friend.name,
        stars: friend.allStars,
        accuracy: friend.allAccuracy,
        streakDays: friend.allStreak,
        games: friend.allGames,
        isMock: true,
        isLocal: false,
        rank: 0,
      };
    }

    const random = createSeededRandom(
      hashStringToSeed(`${weekKey}:${friend.id}`),
    );

    return {
      playerId: `mock:${friend.id}`,
      playerName: friend.name,
      stars: 8 + Math.floor(random() * 30),
      accuracy: 0.62 + random() * 0.33,
      streakDays: 1 + Math.floor(random() * 6),
      games: 3 + Math.floor(random() * 10),
      isMock: true,
      isLocal: false,
      rank: 0,
    };
  });
}

/**
 * 本地球员周榜：本周记录累加，正确率按总正确/总作答加权。
 */
export function buildLocalWeeklyRow(
  entries: readonly LeaderboardEntry[],
  weekKey: string = getWeekKey(),
  playerId: string = LOCAL_PLAYER_ID,
  playerName: string = LOCAL_PLAYER_NAME,
): LeaderboardRow | null {
  const weeklyEntries = entries.filter(
    (entry) =>
      entry.playerId === playerId &&
      !entry.isMock &&
      entry.weekKey === weekKey,
  );

  if (weeklyEntries.length === 0) return null;

  let stars = 0;
  let totalCorrect = 0;
  let totalAnswered = 0;
  let accuracySum = 0;
  let streakDays = 0;

  for (const entry of weeklyEntries) {
    stars += entry.stars;

    const answered = Math.max(
      0,
      Math.floor(entry.answeredCount ?? 0),
    );
    const correct = Math.max(
      0,
      Math.min(
        answered,
        Math.floor(
          entry.correctCount ??
            entry.accuracy * answered,
        ),
      ),
    );

    totalAnswered += answered;
    totalCorrect += correct;
    accuracySum += entry.accuracy;
    streakDays = Math.max(streakDays, entry.streakDays ?? 0);
  }

  const accuracy =
    totalAnswered > 0
      ? totalCorrect / totalAnswered
      : accuracySum / weeklyEntries.length;

  return {
    playerId,
    playerName,
    stars,
    accuracy: Math.min(1, Math.max(0, accuracy)),
    streakDays,
    games: weeklyEntries.length,
    isMock: false,
    isLocal: true,
    rank: 0,
  };
}

/**
 * 本地球员总榜：星星取 30 关最佳星级之和，正确率取总作答加权。
 */
export function buildLocalAllTimeRow(
  progress: PlayerProgress,
  games: number,
  playerId: string = LOCAL_PLAYER_ID,
  playerName: string = LOCAL_PLAYER_NAME,
): LeaderboardRow | null {
  const hasActivity =
    progress.learnedWordIds.length > 0 ||
    progress.totalAnswered > 0 ||
    games > 0;

  if (!hasActivity) return null;

  const stats = computeLearningStats(progress);

  return {
    playerId,
    playerName,
    stars: stats.totalStars,
    accuracy: calculateAccuracy(
      progress.totalCorrect,
      progress.totalAnswered,
    ),
    streakDays: Math.max(0, progress.streakDays),
    games: Math.max(0, games),
    isMock: false,
    isLocal: true,
    rank: 0,
  };
}

export function mergeLeaderboardRows(
  ...groups: ReadonlyArray<readonly LeaderboardRow[]>
): LeaderboardRow[] {
  return rankLeaderboardRows(groups.flat());
}

export { LOCAL_PLAYER_ID, LOCAL_PLAYER_NAME };
