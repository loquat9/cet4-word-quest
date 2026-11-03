import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { LeaderboardRow } from '../components/leaderboard/LeaderboardRow';
import { Button, buttonStyles } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { leaderboardService } from '../services/leaderboard';
import { usePlayerStore } from '../store/playerStore';
import type {
  LeaderboardRange,
  LeaderboardRow as LeaderboardRowData,
} from '../types';
import { formatPercent } from '../utils/format';
import { cn } from '../utils/cn';

const RANGES: Array<{ value: LeaderboardRange; label: string }> = [
  { value: 'week', label: '本周榜' },
  { value: 'all', label: '总榜' },
];

export function LeaderboardPage() {
  const [range, setRange] = useState<LeaderboardRange>('week');
  const [rows, setRows] = useState<LeaderboardRowData[] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const progress = usePlayerStore((state) => state.progress);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    void leaderboardService
      .getLeaderboard(range, progress)
      .then((nextRows) => {
        if (!active) return;
        setRows(nextRows);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        console.error('[leaderboard] 加载失败', loadError);
        setError('排行榜加载失败，请稍后重试。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range, progress, reloadKey]);

  const localRow = rows?.find((row) => row.isLocal) ?? null;
  const rangeLabel = range === 'week' ? '本周' : '总';

  return (
    <div>
      <PageHeader
        title="排行榜"
        subtitle="按星星总数、正确率、连续学习天数排序。"
        backTo="/"
        backLabel="首页"
      />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {RANGES.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={range === item.value}
            onClick={() => setRange(item.value)}
            className={cn(
              'min-h-11 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
              range === item.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!loading && !error && localRow ? (
        <Card className="mt-3 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                我的{rangeLabel}排名
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                #{localRow.rank}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  / {rows?.length ?? 0} 人
                </span>
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-semibold tabular-nums text-primary">
                  {localRow.stars}
                </p>
                <p className="text-[10px] text-slate-400">星星</p>
              </div>
              <div>
                <p className="text-sm font-semibold tabular-nums text-slate-800">
                  {formatPercent(localRow.accuracy)}
                </p>
                <p className="text-[10px] text-slate-400">正确率</p>
              </div>
              <div>
                <p className="text-sm font-semibold tabular-nums text-slate-800">
                  {localRow.streakDays}
                </p>
                <p className="text-[10px] text-slate-400">连续天</p>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {!loading && !error && !localRow ? (
        <Card className="mt-3 animate-fade-in text-center">
          <p className="text-sm font-medium text-slate-700">
            {range === 'week'
              ? '本周还没有你的成绩'
              : '还没有可上榜的成绩'}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            完成一局普通关或 Boss 关后，会自动记录到排行榜。
          </p>
          <Link
            to="/map"
            className={buttonStyles('secondary', 'md', 'mt-3 w-full')}
          >
            去闯关
          </Link>
        </Card>
      ) : null}

      <Card className="mt-3 animate-fade-in">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {range === 'week' ? '本周排行' : '总排行'}
          </h2>
          <span className="text-[11px] text-slate-400">
            模拟好友 · 本地数据
          </span>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">
            正在加载排行榜…
          </p>
        ) : null}

        {error ? (
          <div className="py-4 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={() => {
                setReloadKey((value) => value + 1);
              }}
            >
              重新加载
            </Button>
          </div>
        ) : null}

        {!loading && !error && rows && rows.length > 0 ? (
          <ul className="mt-2 divide-y divide-slate-100">
            {rows.map((row) => (
              <LeaderboardRow key={row.playerId} row={row} />
            ))}
          </ul>
        ) : null}
      </Card>

      <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
        排序：星星总数 → 正确率 → 连续学习天数。好友数据为本地模拟。
      </p>

      <Link
        to="/pk"
        className={buttonStyles('secondary', 'md', 'mt-3 w-full')}
      >
        去好友 PK
      </Link>
    </div>
  );
}
