import type {
  LeaderboardEntry,
  PlayerProgress,
  Settings,
  WrongWordRecord,
} from '../../types';
import { createDefaultProgress, createDefaultSettings } from './defaults';

const STORAGE_KEYS = {
  settings: 'cet4-word-quest:settings',
  progress: 'cet4-word-quest:progress',
  wrongWords: 'cet4-word-quest:wrong-words',
  leaderboard: 'cet4-word-quest:leaderboard',
} as const;

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryKeyValueStore implements KeyValueStore {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

/**
 * localStorage / 内存降级实现。
 *
 * 两者共用同一套序列化逻辑，仅底层 KeyValueStore 不同；
 * memory 模式下刷新页面数据会丢失，必须向用户展示提示。
 */
export class FallbackStorage {
  readonly backend: 'localstorage' | 'memory';
  private readonly store: KeyValueStore;

  constructor(store: KeyValueStore, backend: 'localstorage' | 'memory') {
    this.store = store;
    this.backend = backend;
  }

  private read<T>(key: string, fallback: T): T {
    const raw = this.store.getItem(key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private write(key: string, value: unknown): void {
    this.store.setItem(key, JSON.stringify(value));
  }

  async getSettings(): Promise<Settings> {
    return (
      this.read<Settings | null>(STORAGE_KEYS.settings, null) ??
      createDefaultSettings()
    );
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.write(STORAGE_KEYS.settings, settings);
  }

  async getProgress(): Promise<PlayerProgress> {
    return (
      this.read<PlayerProgress | null>(STORAGE_KEYS.progress, null) ??
      createDefaultProgress()
    );
  }

  async saveProgress(progress: PlayerProgress): Promise<void> {
    this.write(STORAGE_KEYS.progress, progress);
  }

  async getWrongWords(): Promise<WrongWordRecord[]> {
    return this.read<WrongWordRecord[]>(STORAGE_KEYS.wrongWords, []);
  }

  async saveWrongWord(record: WrongWordRecord): Promise<void> {
    const records = await this.getWrongWords();
    const index = records.findIndex((item) => item.wordId === record.wordId);

    if (index >= 0) {
      records[index] = record;
    } else {
      records.push(record);
    }

    this.write(STORAGE_KEYS.wrongWords, records);
  }

  async deleteWrongWord(wordId: string): Promise<void> {
    const records = (await this.getWrongWords()).filter(
      (item) => item.wordId !== wordId,
    );
    this.write(STORAGE_KEYS.wrongWords, records);
  }

  async clearWrongWords(): Promise<void> {
    this.write(STORAGE_KEYS.wrongWords, []);
  }

  async getLeaderboardEntries(): Promise<LeaderboardEntry[]> {
    return this.read<LeaderboardEntry[]>(STORAGE_KEYS.leaderboard, []);
  }

  async saveLeaderboardEntry(entry: LeaderboardEntry): Promise<void> {
    const entries = await this.getLeaderboardEntries();
    const index = entries.findIndex((item) => item.id === entry.id);

    if (index >= 0) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }

    this.write(STORAGE_KEYS.leaderboard, entries);
  }

  async resetProgressData(): Promise<void> {
    this.store.removeItem(STORAGE_KEYS.progress);
    this.store.removeItem(STORAGE_KEYS.wrongWords);
  }
}
