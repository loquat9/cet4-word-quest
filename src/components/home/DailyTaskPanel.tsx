import type { DailyTaskProgress } from '../../types';
import type { DailyTaskId } from '../../data/dailyTasks';
import {
  DAILY_TASKS,
} from '../../data/dailyTasks';
import {
  getClaimableCoins,
  getDailyTaskProgress,
} from '../../game/dailyTasks';
import { cn } from '../../utils/cn';

interface DailyTaskPanelProps {
  task: DailyTaskProgress;
  claimingTaskId: DailyTaskId | null;
  error?: string | null;
  onClaim: (taskId: DailyTaskId) => void;
}

/**
 * 每日任务进度与领取。
 * 完成状态由纯逻辑实时计算，领取按钮只负责触发 store action。
 */
export function DailyTaskPanel({
  task,
  claimingTaskId,
  error,
  onClaim,
}: DailyTaskPanelProps) {
  const claimableCoins = getClaimableCoins(task);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">
          每日任务
        </h2>
        <span className="shrink-0 text-[11px] text-slate-400">
          {claimableCoins > 0
            ? `可领取 +${claimableCoins} 金币`
            : '本地时间每日 0 点重置'}
        </span>
      </div>

      <ul className="mt-2 divide-y divide-slate-100">
        {DAILY_TASKS.map((definition) => {
          const current = getDailyTaskProgress(task, definition);
          const complete = current >= definition.target;
          const claimed = task.claimedTaskIds.includes(
            definition.id,
          );
          const claiming = claimingTaskId === definition.id;
          const percent = Math.min(
            100,
            Math.round((current / definition.target) * 100),
          );

          return (
            <li key={definition.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      complete
                        ? 'text-slate-900'
                        : 'text-slate-700',
                    )}
                  >
                    {definition.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                    {definition.description} · +
                    {definition.rewardCoins} 金币
                  </p>
                </div>

                {!complete ? (
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                    {Math.min(current, definition.target)}/
                    {definition.target}
                  </span>
                ) : claimed ? (
                  <span className="shrink-0 text-[11px] font-medium text-success">
                    已领取
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={() => onClaim(definition.id)}
                    className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {claiming
                      ? '领取中…'
                      : `领取 +${definition.rewardCoins}`}
                  </button>
                )}
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    'h-full rounded-full progress-transition',
                    complete ? 'bg-success' : 'bg-primary',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="mt-2 text-[11px] leading-4 text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
