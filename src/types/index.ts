/**
 * 全局领域类型。
 *
 * 阶段 0 先建立稳定的数据契约，后续词库、题型生成、关卡配置与存储层
 * 都围绕这些类型扩展，避免各页面各自定义临时结构。
 */

export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6;

export type QuestionType =
  | 'word-to-meaning'
  | 'meaning-to-word'
  | 'listen-to-word'
  | 'example-fill'
  | 'dictation';

export type LevelKind = 'normal' | 'boss' | 'review' | 'pk';

export type StarRating = 0 | 1 | 2 | 3;

export type StorageBackend = 'indexeddb' | 'localstorage' | 'memory';

/**
 * 词库单词。字段与 CET-4 JSON 词库严格对应。
 */
export interface Word {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  pos: string;
  example: string;
  exampleTranslation: string;
  chapter: ChapterId;
  difficulty: number;
  audioUrl: string;
}

/**
 * 统一题目对象。
 *
 * 选择题（前四类）使用 options + correctIndex；
 * 听写题 options 为空数组、correctIndex 为 null，使用 correctAnswer 判题。
 */
export interface Question {
  id: string;
  type: QuestionType;
  wordId: string;
  chapter: ChapterId;
  difficulty: number;
  word: string;
  phonetic: string;
  meaning: string;
  /** 交给发音服务的文本，通常为单词本身 */
  audioText: string;
  /** 题目主展示内容：单词、中文释义、带空格的例句或听写提示 */
  prompt: string;
  options: string[];
  correctAnswer: string;
  correctIndex: number | null;
  example?: string;
  exampleTranslation?: string;
  /** 听写提示，如 "a _ _ _ _ _ _"，仅听写题生成 */
  hint?: string;
  /** 听写答案的字符数，用于输入框 maxLength 与字母槽展示 */
  answerLength?: number;
}

/**
 * 关卡配置。题量为该关的目标题数，实际可能因生命值归零或时间到而提前结束。
 */
export interface LevelConfig {
  id: string;
  chapter: ChapterId;
  index: number;
  title: string;
  kind: LevelKind;
  questionCount: number;
  timeLimitSec: number;
  hearts: number;
  questionTypes: QuestionType[];
  /** 听写首字母提示价格；第 5、6 章更贵，体现“减少提示” */
  hintCostCoins: number;
  unlockAfterLevelId?: string;
}

export interface DailyTaskProgress {
  date: string;
  newWordsLearned: number;
  wrongWordsReviewed: number;
  gamesPlayed: number;
  /** 今天已复习过的错词 wordId，用于去重计数 */
  reviewedWordIds: string[];
  claimedTaskIds: string[];
}

export interface LevelProgress {
  levelId: string;
  stars: StarRating;
  bestAccuracy: number;
  bestTimeSec: number;
  completedAt: string;
}

export interface PlayerProgress {
  id: 'local';
  coins: number;
  unlockedLevelIds: string[];
  levelProgress: Record<string, LevelProgress>;
  learnedWordIds: string[];
  totalAnswered: number;
  totalCorrect: number;
  streakDays: number;
  lastStudyDate: string | null;
  dailyTask: DailyTaskProgress;
  /** 最近一局结果，用于结算页刷新后恢复 */
  lastResult?: RoundResult | null;
  updatedAt: string;
}

export type GameStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'feedback'
  | 'finished'
  | 'error';

export type RoundEndReason = 'completed' | 'time' | 'hearts';

export interface AnswerRecord {
  questionId: string;
  wordId: string;
  type: QuestionType;
  selectedAnswer: string;
  isCorrect: boolean;
  elapsedMs: number;
}

export interface AnswerFeedback {
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  question: Question;
  combo: number;
  comboBonusCoins: number;
  autoAdvanceMs: number;
}

/**
 * 听写提示请求结果。
 * insufficient：金币不足；error：存储失败；busy：请求进行中。
 */
export type HintRequestResult =
  | 'ok'
  | 'insufficient'
  | 'used'
  | 'busy'
  | 'wrong-type'
  | 'not-playing'
  | 'error';

export interface WrongAnswerSnapshot {
  wordId: string;
  word: string;
  phonetic: string;
  meaning: string;
  chapter: ChapterId;
  example: string;
  exampleTranslation: string;
  selectedAnswer: string;
  correctAnswer: string;
}

export interface LearnedWordSnapshot {
  wordId: string;
  word: string;
  phonetic: string;
  meaning: string;
}

export interface RoundResult {
  levelId: string;
  chapter: ChapterId;
  kind: LevelKind;
  startedAt: string;
  endedAt: string;
  timeLimitSec: number;
  timeUsedSec: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
  stars: StarRating;
  score: number;
  coins: number;
  maxCombo: number;
  learnedWordIds: string[];
  learnedWords: LearnedWordSnapshot[];
  wrongAnswers: WrongAnswerSnapshot[];
  endReason: RoundEndReason;
}

/**
 * 错词记录。
 *
 * reviewStage 对应简化间隔重复的 0 / 1 / 3 / 7 天节点，
 * 具体调度在阶段 5 实现。
 */
export interface WrongWordRecord {
  wordId: string;
  word: string;
  phonetic: string;
  meaning: string;
  chapter: ChapterId;
  wrongCount: number;
  lastWrongAt: string;
  nextReviewAt: string;
  reviewStage: number;
}

export interface Settings {
  id: 'local';
  soundEnabled: boolean;
  speechEnabled: boolean;
  updatedAt: string;
}

export type LeaderboardRange = 'week' | 'all';

export interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  levelId: string;
  stars: StarRating;
  accuracy: number;
  durationSec: number;
  score: number;
  playedAt: string;
  weekKey: string;
  isMock: boolean;
  /** 本局正确题数，用于加权正确率 */
  correctCount: number;
  /** 本局作答题数，用于加权正确率 */
  answeredCount: number;
  /** 记录时的连续学习天数 */
  streakDays: number;
}

/**
 * 排行榜聚合行。模拟好友与本地球员使用同一结构。
 */
export interface LeaderboardRow {
  playerId: string;
  playerName: string;
  stars: number;
  accuracy: number;
  streakDays: number;
  games: number;
  isMock: boolean;
  isLocal: boolean;
  rank: number;
}

/**
 * 章节元数据。
 *
 * targetCapacity 是完整词库下的目标容量；
 * loadedCount 是当前实际加载的示例词数，阶段 1 接入词库后更新。
 */
export interface ChapterConfig {
  id: ChapterId;
  title: string;
  subtitle: string;
  targetCapacity: number;
  loadedCount: number;
  focusQuestionTypes: QuestionType[];
  /** 本章出题权重；键必须在 focusQuestionTypes 内，权重之和由出题逻辑归一化 */
  questionTypeWeights: Partial<Record<QuestionType, number>>;
  bossLevelIndex: number;
}
