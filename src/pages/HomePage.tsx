import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DailyTaskPanel } from '../components/home/DailyTaskPanel';
import { StatsGrid } from '../components/home/StatsGrid';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import { CHAPTERS, TOTAL_LEVELS } from '../data/chapterConfig';
import { computeLearningStats } from '../game/learningStats';
import { useWrongBookSummary } from '../hooks/useWrongBookSummary';
import { usePlayerStore } from '../store/playerStore';

interface HomeEntry {
  to: string;
  title: string;
  description: string;
  badge?: number;
}

export function HomePage() {
  const progress = usePlayerStore((state) => state.progress);
  const claimDailyTask = usePlayerStore(
    (state) => state.claimDailyTask,
  );
  const claimingTaskId = usePlayerStore(
    (state) => state.claimingTaskId,
  );
  const playerError = usePlayerStore((state) => state.error);
  const ensureDailyTask = usePlayerStore(
    (state) => state.ensureDailyTask,
  );

  const {
    summary: wrongBookSummary,
    loading: wrongBookLoading,
    refresh: refreshWrongBook,
  } = useWrongBookSummary();

  const stats = computeLearningStats(progress);
  const dailyTask = progress.dailyTask;

  useEffect(() => {
    void ensureDailyTask();
  }, [ensureDailyTask]);

  useEffect(() => {
    function handleFocus() {
      void ensureDailyTask();
      void refreshWrongBook();
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      void ensureDailyTask();
      void refreshWrongBook();
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );
    };
  }, [ensureDailyTask, refreshWrongBook]);

  const wrongBookDescription = wrongBookLoading
    ? '正在统计错词…'
    : wrongBookSummary.total > 0
      ? `待复习 ${wrongBookSummary.due} 个 · 共 ${wrongBookSummary.total} 个`
      : '集中复习答错的词';

  const entries: HomeEntry[] = [
    {
      to: '/wrongbook',
      title: '错词本',
      description: wrongBookDescription,
      badge: wrongBookSummary.due,
    },
    {
      to: '/leaderboard',
      title: '排行榜',
      description: '本周榜与总榜',
    },
    {
      to: '/pk',
      title: '好友 PK',
      description: '同题对战，比正确率',
    },
    {
      to: '/settings',
      title: '设置',
      description: '音效、发音与进度',
    },
  ];

  return (
    <div className="animate-fade-in">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-primary">
          CET-4 · 5 分钟一局
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          四级词闯关
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          短时高频，把单词记牢。每天一局，逐步推进 {CHAPTERS.length}{' '}
          章 {TOTAL_LEVELS} 关。
        </p>
      </header>

      <Card className="mt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">
              今日学习
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {dailyTask.newWordsLearned}
              <span className="ml-1 text-sm font-normal text-slate-500">
                / 10 个新词
              </span>
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
            {stats.streakDays > 0
              ? `连续 ${stats.streakDays} 天`
              : '今日开始'}
          </span>
        </div>

        <div className="mt-4">
          <DailyTaskPanel
            task={dailyTask}
            claimingTaskId={claimingTaskId}
            error={playerError}
            onClaim={(taskId) => {
              void claimDailyTask(taskId);
            }}
          />
        </div>

        <Link
          to="/map"
          className={buttonStyles('primary', 'lg', 'mt-5 w-full')}
        >
          {stats.completedLevels > 0 ? '继续闯关' : '开始闯关'}
        </Link>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {entries.map((entry) => (
          <Link
            key={entry.to}
            to={entry.to}
            className="relative min-h-20 rounded-card border border-slate-200 bg-white p-4 transition-colors duration-150 hover:border-primary/30 hover:bg-primary-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            {entry.badge && entry.badge > 0 ? (
              <span className="absolute right-3 top-3 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {entry.badge}
              </span>
            ) : null}
            <p className="pr-6 text-sm font-semibold text-slate-800">
              {entry.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {entry.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <StatsGrid stats={stats} coins={progress.coins} />
      </div>

      <p className="mt-5 text-center text-xs text-slate-400">
        阶段 4 · 错词复习与每日任务
      </p>
    </div>
  );
}
