import type { PlayerProgress, Settings } from '../../types';
import { toDateKey } from '../../utils/date';

export const SETTINGS_ID = 'local' as const;
export const PROGRESS_ID = 'local' as const;

export function createDefaultSettings(): Settings {
  return {
    id: SETTINGS_ID,
    soundEnabled: true,
    speechEnabled: true,
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultProgress(): PlayerProgress {
  return {
    id: PROGRESS_ID,
    coins: 0,
    unlockedLevelIds: ['c1-l1'],
    levelProgress: {},
    learnedWordIds: [],
    totalAnswered: 0,
    totalCorrect: 0,
    streakDays: 0,
    lastStudyDate: null,
    dailyTask: {
      date: toDateKey(new Date()),
      newWordsLearned: 0,
      wrongWordsReviewed: 0,
      gamesPlayed: 0,
      reviewedWordIds: [],
      claimedTaskIds: [],
    },
    lastResult: null,
    updatedAt: new Date().toISOString(),
  };
}
