import type { ChapterId, Word } from '../../types';
import {
  getChapterLoadedCount,
  VOCABULARY_META,
} from '../../data/cet4/meta';
import type { VocabularyMeta } from '../../data/cet4/meta';
import {
  assertChapterWords,
  VocabularyValidationError,
} from './validate';

export interface ChapterWords {
  chapter: ChapterId;
  words: readonly Word[];
}

export class VocabularyLoadError extends Error {
  readonly chapter: ChapterId;
  readonly issues: readonly string[];

  constructor(
    chapter: ChapterId,
    issues: readonly string[],
    cause?: unknown,
  ) {
    super(`词库第 ${chapter} 章加载失败`, { cause });
    this.name = 'VocabularyLoadError';
    this.chapter = chapter;
    this.issues = issues;
  }
}

const CHAPTER_IDS: readonly ChapterId[] = [1, 2, 3, 4, 5, 6];

const CHAPTER_LOADERS: Record<
  ChapterId,
  () => Promise<{ default: unknown }>
> = {
  1: () => import('../../data/cet4/chapter-1.json'),
  2: () => import('../../data/cet4/chapter-2.json'),
  3: () => import('../../data/cet4/chapter-3.json'),
  4: () => import('../../data/cet4/chapter-4.json'),
  5: () => import('../../data/cet4/chapter-5.json'),
  6: () => import('../../data/cet4/chapter-6.json'),
};

const chapterCache = new Map<ChapterId, readonly Word[]>();
const inFlight = new Map<ChapterId, Promise<readonly Word[]>>();

function toIssues(error: unknown): string[] {
  if (error instanceof VocabularyValidationError) {
    return [...error.issues];
  }

  if (error instanceof Error) {
    return [error.message];
  }

  return [String(error)];
}

/**
 * 按章懒加载词库。首次调用加载对应 JSON；后续调用命中内存缓存。
 * 同一章节的并发请求会复用同一个 in-flight Promise。
 */
export async function loadChapterWords(
  chapter: ChapterId,
): Promise<readonly Word[]> {
  if (!CHAPTER_IDS.includes(chapter)) {
    throw new VocabularyLoadError(chapter, [
      `无效章节：${String(chapter)}`,
    ]);
  }

  const cached = chapterCache.get(chapter);
  if (cached) return cached;

  const pending = inFlight.get(chapter);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const module = await CHAPTER_LOADERS[chapter]();
      const words = assertChapterWords(module.default, chapter);
      const expected = getChapterLoadedCount(chapter);

      if (words.length !== expected) {
        throw new VocabularyValidationError(
          `第 ${chapter} 章词数与 meta.json 不一致`,
          [`meta: ${expected} 词，实际: ${words.length} 词`],
        );
      }

      chapterCache.set(chapter, words);
      return words;
    } catch (error) {
      throw new VocabularyLoadError(chapter, toIssues(error), error);
    } finally {
      inFlight.delete(chapter);
    }
  })();

  inFlight.set(chapter, promise);
  return promise;
}

/**
 * 加载全部章节。仅用于设置页“词库自检”等显式操作，
 * 不应在首页或关卡地图首屏调用。
 */
export async function loadAllChapters(): Promise<
  ReadonlyArray<ChapterWords>
> {
  return Promise.all(
    CHAPTER_IDS.map(async (chapter) => ({
      chapter,
      words: await loadChapterWords(chapter),
    })),
  );
}

export async function getWordById(
  wordId: string,
  chapter?: ChapterId,
): Promise<Word | null> {
  if (chapter) {
    const words = await loadChapterWords(chapter);
    return words.find((word) => word.id === wordId) ?? null;
  }

  for (const chapterId of CHAPTER_IDS) {
    const words = await loadChapterWords(chapterId);
    const found = words.find((word) => word.id === wordId);
    if (found) return found;
  }

  return null;
}

export function getVocabularyMeta(): VocabularyMeta {
  return VOCABULARY_META;
}

export function clearVocabularyCache(): void {
  chapterCache.clear();
  inFlight.clear();
}
