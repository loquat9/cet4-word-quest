/**
 * 每日任务定义。
 * 数值同时用于首页进度展示与领取校验，避免文案与目标不一致。
 */export type DailyTaskId = 'learn-new' | 'review-wrong' | 'play-game';

export type DailyTaskMetric =
  | 'newWordsLearned'
  | 'wrongWordsReviewed'
  | 'gamesPlayed';

export interface DailyTaskDefinition {
  id: DailyTaskId;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
  metric: DailyTaskMetric;
}

export const DAILY_TASKS: readonly DailyTaskDefinition[] = [
  {
    id: 'learn-new',
    title: '学习 10 个新词',
    description: '本局首次答对的单词会计入',
    target: 10,
    rewardCoins: 20,
    metric: 'newWordsLearned',
  },
  {
    id: 'review-wrong',
    title: '复习 20 个错词',
    description: '复习错词本中的不同单词',
    target: 20,
    rewardCoins: 30,
    metric: 'wrongWordsReviewed',
  },
  {
    id: 'play-game',
    title: '完成 1 局游戏',
    description: '正常关、复习关或重玩均可',
    target: 1,
    rewardCoins: 10,
    metric: 'gamesPlayed',
  },
];

export function getDailyTask(
  id: string,
): DailyTaskDefinition | undefined {
  return DAILY_TASKS.find((task) => task.id === id);
}

/** 当天所有任务的总奖励金币 */
export const DAILY_TASK_TOTAL_REWARD = DAILY_TASKS.reduce(
  (total, task) => total + task.rewardCoins,
  0,
);
