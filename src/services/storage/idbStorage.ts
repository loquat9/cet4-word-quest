import type {
  LeaderboardEntry,
  PlayerProgress,
  Settings,
  WrongWordRecord,
} from '../../types';
import type { GameDatabase } from './db';
import {
  createDefaultProgress,
  createDefaultSettings,
  PROGRESS_ID,
  SETTINGS_ID,
} from './defaults';

/**
 * IndexedDB 实现。所有方法失败时向上抛出，由调用方展示错误状态；
 * 打开数据库失败时由存储工厂降级到 localStorage / 内存。
 */
export class IdbStorage {
  readonly backend = 'indexeddb' as const;
  private readonly db: GameDatabase;

  constructor(db: GameDatabase) {
    this.db = db;
  }

  async getSettings(): Promise<Settings> {
    return (await this.db.get('settings', SETTINGS_ID)) ?? createDefaultSettings();
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.db.put('settings', settings);
  }

  async getProgress(): Promise<PlayerProgress> {
    return (await this.db.get('progress', PROGRESS_ID)) ?? createDefaultProgress();
  }

  async saveProgress(progress: PlayerProgress): Promise<void> {
    await this.db.put('progress', progress);
  }

  async getWrongWords(): Promise<WrongWordRecord[]> {
    return this.db.getAll('wrongWords');
  }

  async saveWrongWord(record: WrongWordRecord): Promise<void> {
    await this.db.put('wrongWords', record);
  }

  async deleteWrongWord(wordId: string): Promise<void> {
    await this.db.delete('wrongWords', wordId);
  }

  async clearWrongWords(): Promise<void> {
    await this.db.clear('wrongWords');
  }

  async getLeaderboardEntries(): Promise<LeaderboardEntry[]> {
    return this.db.getAll('leaderboard');
  }

  async saveLeaderboardEntry(entry: LeaderboardEntry): Promise<void> {
    await this.db.put('leaderboard', entry);
  }

  async resetProgressData(): Promise<void> {
    const transaction = this.db.transaction(
      ['progress', 'wrongWords'],
      'readwrite',
    );

    // 两个 clear 必须在同一事务内同步发起，避免 await 后事务已自动提交。
    const clearProgress = transaction.objectStore('progress').clear();
    const clearWrongWords = transaction.objectStore('wrongWords').clear();

    await Promise.all([clearProgress, clearWrongWords]);
    await transaction.done;
  }
}
