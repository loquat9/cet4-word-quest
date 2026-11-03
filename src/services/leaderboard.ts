import type {
  LeaderboardEntry,
  LeaderboardRange,
  LeaderboardRow,
  PlayerProgress,
  RoundResult,
} from '../types';
import {
  LOCAL_PLAYER_ID,
  LOCAL_PLAYER_NAME,
  buildLocalAllTimeRow,
  buildLocalWeeklyRow,
  buildMockLeaderboardRows,
  mergeLeaderboardRows,
} from '../game/leaderboard';
import { getWeekKey } from '../utils/date';
import { getStorage } from './storage';

/**
 * 排行榜服务接口。
 *
 * 当前为本地实现；后续接后端时只需提供相同方法的 HTTP 实现，
 * 页面不需要改动。
 */
export interface LeaderboardService {
  recordRound(
    result: RoundResult,
    streakDays: number,
  ): Promise<void>;

  getLeaderboard(
    range: LeaderboardRange,
    progress?: PlayerProgress,
  ): Promise<LeaderboardRow[]>;
}

function createEntryId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `lb-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function isRankedRound(result: RoundResult): boolean {
  return result.kind === 'normal' || result.kind === 'boss';
}

/**
 * IndexedDB 本地排行榜。
 *
 * - 只记录 normal / boss，复习关与 PK 不计入；
 * - 模拟好友不落库，由纯函数确定性生成；
 * - 总榜本地球员使用最佳星级，周榜使用本周记录累加。
 */
export class LocalLeaderboardService implements LeaderboardService {
  async recordRound(
    result: RoundResult,
    streakDays: number,
  ): Promise<void> {
    if (!isRankedRound(result)) return;

    const playedAt = new Date(result.endedAt);
    const safePlayedAt = Number.isNaN(playedAt.getTime())
      ? new Date()
      : playedAt;

    const entry: LeaderboardEntry = {
      id: createEntryId(),
      playerId: LOCAL_PLAYER_ID,
      playerName: LOCAL_PLAYER_NAME,
      levelId: result.levelId,
      stars: result.stars,
      accuracy: result.accuracy,
      durationSec: result.timeUsedSec,
      score: result.score,
      playedAt: safePlayedAt.toISOString(),
      weekKey: getWeekKey(safePlayedAt),
      isMock: false,
      correctCount: result.correctCount,
      answeredCount: result.answeredCount,
      streakDays: Math.max(0, streakDays),
    };

    const storage = await getStorage();
    await storage.saveLeaderboardEntry(entry);
  }

  async getLeaderboard(
    range: LeaderboardRange,
    progress?: PlayerProgress,
  ): Promise<LeaderboardRow[]> {
    const storage = await getStorage();
    const entries = await storage.getLeaderboardEntries();
    const weekKey = getWeekKey();

    const localEntries = entries.filter(
      (entry) =>
        entry.playerId === LOCAL_PLAYER_ID && !entry.isMock,
    );

    const localRow =
      range === 'week'
        ? buildLocalWeeklyRow(entries, weekKey)
        : progress
          ? buildLocalAllTimeRow(progress, localEntries.length)
          : null;

    const mockRows = buildMockLeaderboardRows(range, weekKey);

    return mergeLeaderboardRows(
      mockRows,
      localRow ? [localRow] : [],
    );
  }
}

export const leaderboardService: LeaderboardService =
  new LocalLeaderboardService();
