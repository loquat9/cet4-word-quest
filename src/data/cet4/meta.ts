import rawMeta from './meta.json';
import type { ChapterId } from '../../types';

export interface VocabularyMeta {
  version: string;
  isSample: boolean;
  totalWords: number;
  source: string;
  updatedAt: string;
  chapters: Record<string, number>;
}

export const VOCABULARY_META = rawMeta as VocabularyMeta;

/**
 * 章节实际加载词数。完整词库替换时只需更新 meta.json，章节配置会自动同步。
 */
export function getChapterLoadedCount(chapter: ChapterId): number {
  return VOCABULARY_META.chapters[String(chapter)] ?? 0;
}
