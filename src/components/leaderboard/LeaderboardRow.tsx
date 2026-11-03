import type { LeaderboardRow as LeaderboardRowData } from '../../types';
import { formatPercent } from '../../utils/format';
import { cn } from '../../utils/cn';

interface LeaderboardRowProps {
  row: LeaderboardRowData;
}

/**
 * 排行榜行：排名、昵称、星星、正确率、连续天数与对局数。
 * 本地玩家高亮，模拟好友带“好友”标签。
 */
export function LeaderboardRow({ row }: LeaderboardRowProps) {
  const topThree = row.rank <= 3;
  const initial = row.playerName.slice(0, 1) || '?';

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-3 py-3',
        row.isLocal && 'rounded-xl bg-primary-soft/40',
      )}
    >
      <span
        className={cn(
          'w-6 shrink-0 text-center text-sm font-semibold tabular-nums',
          topThree ? 'text-primary' : 'text-slate-400',
        )}
      >
        {row.rank}
      </span>

      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          row.isLocal
            ? 'bg-primary text-white'
            : 'bg-slate-100 text-slate-600',
        )}
        aria-hidden="true"
      >
        {initial}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-slate-900">
            {row.playerName}
          </p>
          {row.isLocal ? (
            <span className="shrink-0 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
              我
            </span>
          ) : row.isMock ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">
              好友
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
          <span className="font-medium text-primary">
            ★ {row.stars}
          </span>
          {' · '}
          正确率 {formatPercent(row.accuracy)}
          {' · '}
          连续 {row.streakDays} 天
        </p>
      </div>

      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
        {row.games} 局
      </span>
    </li>
  );
}
