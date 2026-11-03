import { Link } from 'react-router-dom';
import type { LevelMapState } from '../../game/mapProgress';
import { cn } from '../../utils/cn';

const STAR_SLOTS = [1, 2, 3];

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

interface LevelNodeProps {
  state: LevelMapState;
}

/**
 * 地图关卡节点：
 * - 未解锁：禁用按钮，不进入答题；
 * - 已解锁未完成：可点击；
 * - 已完成：显示最佳星级（实心/空心）。
 */
export function LevelNode({ state }: LevelNodeProps) {
  const statusLabel = state.unlocked
    ? state.completed
      ? `${state.stars} 星`
      : '未通关'
    : '未解锁';
  const ariaLabel = `第 ${state.chapter} 章第 ${state.index} 关${
    state.isBoss ? '（Boss）' : ''
  }，${statusLabel}`;

  const baseClass =
    'flex min-h-[72px] flex-col items-center justify-center rounded-xl border px-1 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2';

  if (!state.unlocked) {
    return (
      <button
        type="button"
        disabled
        aria-label={ariaLabel}
        className={cn(
          baseClass,
          'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300',
        )}
      >
        <LockIcon />
        <span className="mt-1 text-[10px] tabular-nums">
          {state.index}
        </span>
      </button>
    );
  }

  return (
    <Link
      to={`/play/${state.levelId}`}
      aria-label={ariaLabel}
      className={cn(
        baseClass,
        state.isBoss
          ? 'border-primary/30 bg-primary-soft text-primary hover:bg-indigo-100'
          : state.completed
            ? 'border-primary/20 bg-primary-soft/40 text-primary hover:border-primary/40'
            : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary',
      )}
    >
      <span className="text-sm font-semibold tabular-nums">
        {state.index}
      </span>
      <span className="mt-0.5 text-[10px]">
        {state.isBoss ? 'Boss' : '关卡'}
      </span>
      <span
        aria-hidden="true"
        className="mt-1 flex gap-0.5 text-[10px] leading-none"
      >
        {STAR_SLOTS.map((slot) => (
          <span
            key={slot}
            className={
              slot <= state.stars
                ? 'text-primary'
                : 'text-slate-200'
            }
          >
            {slot <= state.stars ? '★' : '☆'}
          </span>
        ))}
      </span>
    </Link>
  );
}
