import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  LeaderboardEntry,
  PlayerProgress,
  Settings,
  WrongWordRecord,
} from '../../types';

export const DB_NAME = 'cet4-word-quest';
export const DB_VERSION = 1;

/**
 * IndexedDB 结构。
 *
 * 单机版只需要单条 settings / progress 记录；
 * 错词与排行榜按业务主键存储，并预留索引方便后续排序查询。
 */
export interface Cet4DB extends DBSchema {
  settings: {
    key: string;
    value: Settings;
  };
  progress: {
    key: string;
    value: PlayerProgress;
  };
  wrongWords: {
    key: string;
    value: WrongWordRecord;
    indexes: {
      byLastWrongAt: string;
      byNextReviewAt: string;
    };
  };
  leaderboard: {
    key: string;
    value: LeaderboardEntry;
    indexes: {
      byWeekKey: string;
      byPlayedAt: string;
    };
  };
}

export type GameDatabase = IDBPDatabase<Cet4DB>;

export function openGameDatabase(): Promise<GameDatabase> {
  return openDB<Cet4DB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('wrongWords')) {
        const store = db.createObjectStore('wrongWords', { keyPath: 'wordId' });
        store.createIndex('byLastWrongAt', 'lastWrongAt');
        store.createIndex('byNextReviewAt', 'nextReviewAt');
      }

      if (!db.objectStoreNames.contains('leaderboard')) {
        const store = db.createObjectStore('leaderboard', { keyPath: 'id' });
        store.createIndex('byWeekKey', 'weekKey');
        store.createIndex('byPlayedAt', 'playedAt');
      }
    },
  });
}
