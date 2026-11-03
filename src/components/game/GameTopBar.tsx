import { cn } from '../../utils/cn';
import { formatDuration } from '../../utils/format';

interface GameTopBarProps {
  hearts: number;
  maxHearts: number;
  remainingSec: number;
  combo: number;
  currentIndex: number;
  answeredCount: number;
  totalQuestions: number;
}

export function GameTopBar({
  hearts,
  maxHearts,
  remainingSec,
  combo,
  currentIndex,
  answeredCount,
  totalQuestions,
}: GameTopBarProps) {
  const isLowTime = remainingSec <= 30;
  const progress =
    totalQuestions > 0
      ? Math.min(
          100,
          Math.round((answeredCount / totalQuestions) * 100),
        )
      : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-0.5 text-lg leading-none"
          aria-label={`生命值 ${hearts} / ${maxHearts}`}
        >
          {Array.from({ length: maxHearts }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                index < hearts ? 'text-danger' : 'text-slate-200',
              )}
            >
              ♥
            </span>
          ))}
        </div>

        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            isLowTime ? 'text-danger' : 'text-slate-800',
          )}
          aria-label={`剩余时间 ${remainingSec} 秒`}
        >
          {formatDuration(remainingSec)}
        </p>

        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium tabular-nums',
            combo > 0
              ? 'bg-primary-soft text-primary'
              : 'bg-slate-100 text-slate-500',
          )}
        >
          连击 ×{combo}
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>
            第 {Math.min(currentIndex + 1, totalQuestions)} /{' '}
            {totalQuestions} 题
          </span>
          <span>
            {answeredCount}/{totalQuestions} 已答
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-primary progress-transition"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
