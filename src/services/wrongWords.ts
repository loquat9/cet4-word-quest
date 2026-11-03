import type {
  WrongAnswerSnapshot,
  WrongWordRecord,
} from '../types';
import { getStorage } from './storage';

/**
 * 把本局错词写入 IndexedDB。
 *
 * 阶段 2 只做基础入队：reviewStage = 0，nextReviewAt = now；
 * 完整的 0 / 1 / 3 / 7 天调度在阶段 5 接入。
 */
export async function recordWrongAnswers(
  wrongAnswers: readonly WrongAnswerSnapshot[],
): Promise<void> {
  if (wrongAnswers.length === 0) return;

  const storage = await getStorage();
  const existing = await storage.getWrongWords();
  const existingById = new Map(
    existing.map((record) => [record.wordId, record]),
  );
  const now = new Date().toISOString();

  for (const answer of wrongAnswers) {
    const previous = existingById.get(answer.wordId);

    const record: WrongWordRecord = {
      wordId: answer.wordId,
      word: answer.word,
      phonetic: answer.phonetic,
      meaning: answer.meaning,
      chapter: answer.chapter,
      wrongCount: (previous?.wrongCount ?? 0) + 1,
      lastWrongAt: now,
      nextReviewAt: now,
      reviewStage: 0,
    };

    await storage.saveWrongWord(record);
    existingById.set(record.wordId, record);
  }
}
