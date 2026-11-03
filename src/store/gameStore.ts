import { create } from 'zustand';
import type {
  AnswerFeedback,
  AnswerRecord,
  GameStatus,
  HintRequestResult,
  LearnedWordSnapshot,
  LevelConfig,
  Question,
  RoundEndReason,
  RoundResult,
  WrongAnswerSnapshot,
} from '../types';
import { getLevelConfig } from '../data/levelConfig';
import { getChapterConfig } from '../data/chapterConfig';
import { loadChapterWords } from '../services/vocabulary';
import { generateQuestions } from '../game/questionGenerator';
import { judgeAnswer } from '../game/judgeAnswer';
import {
  BASE_COIN_PER_CORRECT,
  calculateAccuracy,
  getComboBonus,
} from '../game/scoring';
import {
  getStarsForAccuracy,
  HEARTS_PER_GAME,
} from '../game/rules';
import {
  applyRoundOutcome,
  buildNormalRoundTargets,
  createReviewRound,
} from '../services/review';
import { leaderboardService } from '../services/leaderboard';
import { PK_SEED_MAX } from '../services/pk';
import { usePlayerStore } from './playerStore';

export interface StartRoundOptions {
  /** PK 关必传：题目种子 */
  seed?: number;
}

interface GameState {
  status: GameStatus;
  level: LevelConfig | null;
  questions: Question[];
  currentIndex: number;
  answers: AnswerRecord[];
  hearts: number;
  combo: number;
  maxCombo: number;
  score: number;
  coins: number;
  startedAt: number | null;
  questionStartedAt: number | null;
  deadline: number | null;
  feedback: AnswerFeedback | null;
  result: RoundResult | null;
  error: string | null;
  /** 本局已使用过首字母提示的题目 id */
  hintUsedQuestionIds: string[];
  /** 提示扣款请求进行中，用于禁用按钮 */
  hintPending: boolean;

  startRound: (
    levelId: string,
    options?: StartRoundOptions,
  ) => Promise<void>;
  submitAnswer: (answer: string | number) => void;
  requestHint: (questionId: string) => Promise<HintRequestResult>;
  advance: () => void;
  finishRound: (reason: RoundEndReason) => Promise<void>;
  reset: () => void;
}

let startRequestCounter = 0;

function isValidPkSeed(
  seed: number | undefined,
): seed is number {
  return (
    typeof seed === 'number' &&
    Number.isInteger(seed) &&
    seed >= 0 &&
    seed <= PK_SEED_MAX
  );
}

function initialGameFields() {
  return {
    status: 'idle' as GameStatus,
    level: null,
    questions: [] as Question[],
    currentIndex: 0,
    answers: [] as AnswerRecord[],
    hearts: HEARTS_PER_GAME,
    combo: 0,
    maxCombo: 0,
    score: 0,
    coins: 0,
    startedAt: null,
    questionStartedAt: null,
    deadline: null,
    feedback: null,
    result: null,
    error: null,
    hintUsedQuestionIds: [] as string[],
    hintPending: false,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialGameFields(),

  startRound: async (levelId, options = {}) => {
    const level = getLevelConfig(levelId);

    if (!level) {
      set({
        ...initialGameFields(),
        status: 'error',
        error: '关卡不存在，请返回地图重新选择。',
      });
      return;
    }

    if (level.kind === 'pk' && !isValidPkSeed(options.seed)) {
      set({
        ...initialGameFields(),
        status: 'error',
        level,
        error: '对战码无效，请重新输入。',
      });
      return;
    }

    const requestId = startRequestCounter + 1;
    startRequestCounter = requestId;

    set({
      ...initialGameFields(),
      status: 'loading',
      level,
    });

    try {
      let questions: Question[];

      if (level.kind === 'review') {
        const plan = await createReviewRound();
        questions = plan.questions;
      } else if (level.kind === 'pk' && isValidPkSeed(options.seed)) {
        const words = await loadChapterWords(level.chapter);
        const chapterConfig = getChapterConfig(level.chapter);

        questions = generateQuestions({
          words,
          count: level.questionCount,
          types: level.questionTypes,
          weights: chapterConfig?.questionTypeWeights,
          seed: options.seed,
          idPrefix: `pk-${options.seed}-${Date.now()}`,
        });
      } else {
        const words = await loadChapterWords(level.chapter);
        const chapterConfig = getChapterConfig(level.chapter);
        const targets = await buildNormalRoundTargets(
          level.chapter,
          words,
          level.questionCount,
        );

        questions = generateQuestions({
          words,
          count: level.questionCount,
          targets,
          types: level.questionTypes,
          weights: chapterConfig?.questionTypeWeights,
          idPrefix: `${level.id}-${Date.now()}`,
        });
      }

      if (requestId !== startRequestCounter) return;

      const startedAt = Date.now();

      set({
        status: 'playing',
        questions,
        currentIndex: 0,
        answers: [],
        hearts: level.hearts,
        combo: 0,
        maxCombo: 0,
        score: 0,
        coins: 0,
        startedAt,
        questionStartedAt: startedAt,
        deadline: startedAt + level.timeLimitSec * 1000,
        feedback: null,
        result: null,
        error: null,
        hintUsedQuestionIds: [],
        hintPending: false,
      });
    } catch (error) {
      if (requestId !== startRequestCounter) return;

      console.error('[game] 开局失败', error);
      set({
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : '题目生成失败，请稍后重试。',
      });
    }
  },

  submitAnswer: (answer) => {
    const state = get();

    if (state.status !== 'playing') return;

    const question = state.questions[state.currentIndex];
    if (!question) return;

    // 听写题不接受空输入；避免回车/空格误提交
    if (
      question.type === 'dictation' &&
      (typeof answer !== 'string' || answer.trim().length === 0)
    ) {
      return;
    }

    const isCorrect = judgeAnswer(question, answer);
    const selectedAnswer =
      typeof answer === 'number'
        ? (question.options[answer] ?? '')
        : answer.trim();
    const now = Date.now();
    const elapsedMs = state.questionStartedAt
      ? Math.max(0, now - state.questionStartedAt)
      : 0;

    const answerRecord: AnswerRecord = {
      questionId: question.id,
      wordId: question.wordId,
      type: question.type,
      selectedAnswer,
      isCorrect,
      elapsedMs,
    };

    let combo = state.combo;
    let score = state.score;
    let coins = state.coins;
    let hearts = state.hearts;
    let maxCombo = state.maxCombo;
    let comboBonusCoins = 0;

    if (isCorrect) {
      combo += 1;
      score += 1;
      comboBonusCoins = getComboBonus(combo);
      coins += BASE_COIN_PER_CORRECT + comboBonusCoins;
      maxCombo = Math.max(maxCombo, combo);
    } else {
      combo = 0;
      hearts = Math.max(0, hearts - 1);
    }

    const feedback: AnswerFeedback = {
      isCorrect,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      question,
      combo,
      comboBonusCoins,
      autoAdvanceMs: isCorrect ? 600 : 2000,
    };

    set({
      status: 'feedback',
      answers: [...state.answers, answerRecord],
      combo,
      score,
      coins,
      hearts,
      maxCombo,
      feedback,
    });
  },

  requestHint: async (questionId) => {
    const state = get();

    if (state.status !== 'playing' || !state.level) {
      return 'not-playing';
    }

    const question = state.questions[state.currentIndex];

    if (!question || question.id !== questionId) {
      return 'wrong-type';
    }

    if (question.type !== 'dictation') {
      return 'wrong-type';
    }

    if (state.hintUsedQuestionIds.includes(questionId)) {
      return 'used';
    }

    if (state.hintPending) {
      return 'busy';
    }

    const cost = state.level.hintCostCoins;

    if (usePlayerStore.getState().progress.coins < cost) {
      return 'insufficient';
    }

    set({ hintPending: true });

    try {
      const paid = await usePlayerStore.getState().spendCoins(cost);
      if (!paid) return 'error';

      set((current) => ({
        hintUsedQuestionIds: current.hintUsedQuestionIds.includes(
          questionId,
        )
          ? current.hintUsedQuestionIds
          : [...current.hintUsedQuestionIds, questionId],
      }));

      return 'ok';
    } finally {
      set({ hintPending: false });
    }
  },

  advance: () => {
    const state = get();
    if (state.status !== 'feedback') return;

    if (state.hearts <= 0) {
      void state.finishRound('hearts');
      return;
    }

    if (state.currentIndex + 1 >= state.questions.length) {
      void state.finishRound('completed');
      return;
    }

    set({
      status: 'playing',
      currentIndex: state.currentIndex + 1,
      feedback: null,
      questionStartedAt: Date.now(),
    });
  },

  finishRound: async (reason) => {
    const state = get();

    if (
      state.status === 'finished' ||
      !state.level ||
      state.questions.length === 0
    ) {
      return;
    }

    const endedAt = new Date();
    const answeredCount = state.answers.length;
    const correctCount = state.answers.filter(
      (answer) => answer.isCorrect,
    ).length;
    const accuracy = calculateAccuracy(correctCount, answeredCount);
    const stars = getStarsForAccuracy(accuracy);

    const previousProgress = usePlayerStore.getState().progress;
    const previouslyLearned = new Set(previousProgress.learnedWordIds);

    const learnedWordIds = Array.from(
      new Set(
        state.answers
          .filter((answer) => answer.isCorrect)
          .map((answer) => answer.wordId)
          .filter((wordId) => !previouslyLearned.has(wordId)),
      ),
    );

    const questionsById = new Map(
      state.questions.map((question) => [question.id, question]),
    );

    const learnedWords = learnedWordIds
      .map((wordId): LearnedWordSnapshot | null => {
        const question = state.questions.find(
          (item) => item.wordId === wordId,
        );
        if (!question) return null;

        return {
          wordId: question.wordId,
          word: question.word,
          phonetic: question.phonetic,
          meaning: question.meaning,
        };
      })
      .filter(
        (word): word is LearnedWordSnapshot => word !== null,
      );

    const wrongAnswers = state.answers
      .filter((answer) => !answer.isCorrect)
      .map((answer): WrongAnswerSnapshot | null => {
        const question = questionsById.get(answer.questionId);
        if (!question) return null;

        return {
          wordId: question.wordId,
          word: question.word,
          phonetic: question.phonetic,
          meaning: question.meaning,
          chapter: question.chapter,
          example: question.example ?? '',
          exampleTranslation: question.exampleTranslation ?? '',
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: question.correctAnswer,
        };
      })
      .filter(
        (answer): answer is WrongAnswerSnapshot => answer !== null,
      );

    const timeUsedSec = state.startedAt
      ? Math.min(
          state.level.timeLimitSec,
          Math.max(
            0,
            Math.round(
              (endedAt.getTime() - state.startedAt) / 1000,
            ),
          ),
        )
      : 0;

    const result: RoundResult = {
      levelId: state.level.id,
      chapter: state.level.chapter,
      kind: state.level.kind,
      startedAt: new Date(
        state.startedAt ?? endedAt.getTime(),
      ).toISOString(),
      endedAt: endedAt.toISOString(),
      timeLimitSec: state.level.timeLimitSec,
      timeUsedSec,
      totalQuestions: state.questions.length,
      answeredCount,
      correctCount,
      accuracy,
      stars,
      score: state.score,
      coins: state.coins,
      maxCombo: state.maxCombo,
      learnedWordIds,
      learnedWords,
      wrongAnswers,
      endReason: reason,
    };

    set({
      status: 'finished',
      result,
      feedback: null,
      deadline: null,
      questionStartedAt: null,
      error: null,
    });

    let reviewedWordIds: string[] = [];
    let persistenceWarning: string | null = null;

    // PK 只比对成绩，不进入错词复习队列
    if (result.kind !== 'pk') {
      try {
        const outcome = await applyRoundOutcome({
          answers: state.answers,
          wrongAnswers: result.wrongAnswers,
          now: endedAt,
        });
        reviewedWordIds = outcome.reviewedWordIds;
      } catch (error) {
        console.error('[game] 错词复习进度保存失败', error);
        persistenceWarning =
          '错词复习进度保存失败，本局成绩仍会保留。';
      }
    }

    try {
      await usePlayerStore.getState().completeRound(result, {
        reviewedWordIds,
      });
    } catch (error) {
      console.error('[game] 成绩保存失败', error);
      persistenceWarning =
        '成绩已生成，但保存到本地失败，请检查浏览器存储权限。';
    }

    // 只有普通关 / Boss 关进入排行榜；PK 与复习关不记录
    if (result.kind === 'normal' || result.kind === 'boss') {
      try {
        await leaderboardService.recordRound(
          result,
          usePlayerStore.getState().progress.streakDays,
        );
      } catch (error) {
        console.error('[game] 排行榜记录失败', error);
        persistenceWarning =
          persistenceWarning ??
          '成绩已保存，但排行榜记录失败。';
      }
    }

    if (persistenceWarning) {
      set({ error: persistenceWarning });
    }
  },

  reset: () => {
    startRequestCounter += 1;
    set(initialGameFields());
  },
}));
