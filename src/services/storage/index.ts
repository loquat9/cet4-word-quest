import type {
  LeaderboardEntry,
  PlayerProgress,
  Settings,
  StorageBackend,
  WrongWordRecord,
} from '../../types';
import { openGameDatabase } from './db';
import {
  FallbackStorage,
  MemoryKeyValueStore,
  type KeyValueStore,
} from './fallbackStorage';
import { IdbStorage } from './idbStorage';

/**
 * 业务层唯一依赖的存储接口。
 * 后续如果替换为远端 API，只需要提供相同方法的实现。
 */
export interface AppStorage {
  readonly backend: StorageBackend;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;

  getProgress(): Promise<PlayerProgress>;
  saveProgress(progress: PlayerProgress): Promise<void>;

  getWrongWords(): Promise<WrongWordRecord[]>;
  saveWrongWord(record: WrongWordRecord): Promise<void>;
  deleteWrongWord(wordId: string): Promise<void>;
  clearWrongWords(): Promise<void>;

  getLeaderboardEntries(): Promise<LeaderboardEntry[]>;
  saveLeaderboardEntry(entry: LeaderboardEntry): Promise<void>;

  resetProgressData(): Promise<void>;
}

let storagePromise: Promise<AppStorage> | null = null;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error('IndexedDB open timeout')),
      timeoutMs,
    );

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function getBrowserLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;

    const probeKey = '__cet4_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

async function createStorage(): Promise<AppStorage> {
  if (typeof indexedDB !== 'undefined') {
    try {
      const db = await withTimeout(openGameDatabase(), 2000);
      return new IdbStorage(db);
    } catch (error) {
      console.warn(
        '[storage] IndexedDB 不可用，尝试降级到 localStorage。',
        error,
      );
    }
  }

  const localStorageRef = getBrowserLocalStorage();
  if (localStorageRef) {
    return new FallbackStorage(localStorageRef as KeyValueStore, 'localstorage');
  }

  console.warn('[storage] localStorage 不可用，使用内存存储。');
  return new FallbackStorage(new MemoryKeyValueStore(), 'memory');
}

/**
 * 获取全局存储单例。首次调用探测 IndexedDB，失败后自动降级。
 */
export function getStorage(): Promise<AppStorage> {
  if (!storagePromise) {
    storagePromise = createStorage();
  }
  return storagePromise;
}
