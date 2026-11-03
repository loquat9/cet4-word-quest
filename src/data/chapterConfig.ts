import type { ChapterConfig } from '../types';
import { getChapterLoadedCount } from './cet4/meta';
import {
  CHAPTER_QUESTION_TYPE_WEIGHTS,
  getChapterQuestionTypes,
} from './questionTypeWeights';

/**
 * 六章基础配置。
 *
 * loadedCount 从 meta.json 读取，保证地图、设置页与实际词库数量一致；
 * targetCapacity 是完整词库下的目标容量。
 */
export const CHAPTERS: ChapterConfig[] = [
  {
    id: 1,
    title: '基础认知',
    subtitle: '看词选义、看义选词',
    targetCapacity: 750,
    loadedCount: getChapterLoadedCount(1),
    focusQuestionTypes: getChapterQuestionTypes(1),
    questionTypeWeights: CHAPTER_QUESTION_TYPE_WEIGHTS[1],
    bossLevelIndex: 5,
  },
  {
    id: 2,
    title: '词义巩固',
    subtitle: '加入听音辨词',
    targetCapacity: 750,
    loadedCount: getChapterLoadedCount(2),
    focusQuestionTypes: getChapterQuestionTypes(2),
    questionTypeWeights: CHAPTER_QUESTION_TYPE_WEIGHTS[2],
    bossLevelIndex: 5,
  },
  {
    id: 3,
    title: '例句理解',
    subtitle: '例句填空为主，穿插看义选词',
    targetCapacity: 750,
    loadedCount: getChapterLoadedCount(3),
    focusQuestionTypes: getChapterQuestionTypes(3),
    questionTypeWeights: CHAPTER_QUESTION_TYPE_WEIGHTS[3],
    bossLevelIndex: 5,
  },
  {
    id: 4,
    title: '听力强化',
    subtitle: '听音辨词、听写拼写为主',
    targetCapacity: 750,
    loadedCount: getChapterLoadedCount(4),
    focusQuestionTypes: getChapterQuestionTypes(4),
    questionTypeWeights: CHAPTER_QUESTION_TYPE_WEIGHTS[4],
    bossLevelIndex: 5,
  },
  {
    id: 5,
    title: '拼写输出',
    subtitle: '听写拼写为主，减少提示',
    targetCapacity: 750,
    loadedCount: getChapterLoadedCount(5),
    focusQuestionTypes: getChapterQuestionTypes(5),
    questionTypeWeights: CHAPTER_QUESTION_TYPE_WEIGHTS[5],
    bossLevelIndex: 5,
  },
  {
    id: 6,
    title: '综合挑战',
    subtitle: '五类题型混合，Boss 关',
    targetCapacity: 750,
    loadedCount: getChapterLoadedCount(6),
    focusQuestionTypes: getChapterQuestionTypes(6),
    questionTypeWeights: CHAPTER_QUESTION_TYPE_WEIGHTS[6],
    bossLevelIndex: 5,
  },
];

export const CHAPTER_COUNT = CHAPTERS.length;
export const LEVELS_PER_CHAPTER = 5;
export const TOTAL_LEVELS = CHAPTER_COUNT * LEVELS_PER_CHAPTER;

export function getChapterConfig(chapter: number): ChapterConfig | undefined {
  return CHAPTERS.find((item) => item.id === chapter);
}
