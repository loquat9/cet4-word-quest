import { cn } from '../../utils/cn';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

interface OptionGridProps {
  options: string[];
  correctIndex: number | null;
  selectedAnswer: string | null;
  showResult: boolean;
  disabled: boolean;
  onSelect: (index: number) => void;
}

export function OptionGrid({
  options,
  correctIndex,
  selectedAnswer,
  showResult,
  disabled,
  onSelect,
}: OptionGridProps) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((option, index) => {
        const isCorrectOption =
          showResult && correctIndex === index;
        const isWrongSelected =
          showResult &&
          !isCorrectOption &&
          selectedAnswer === option;

        return (
          <button
            key={`${index}-${option}`}
            type="button"
            disabled={disabled}
            aria-pressed={selectedAnswer === option}
            onClick={() => onSelect(index)}
            className={cn(
              'flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-default',
              isCorrectOption
                ? 'border-success/40 bg-green-50 text-green-800'
                : isWrongSelected
                  ? 'border-danger/40 bg-red-50 text-red-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary-soft/30',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                isCorrectOption
                  ? 'bg-success text-white'
                  : isWrongSelected
                    ? 'bg-danger text-white'
                    : 'bg-slate-100 text-slate-500',
              )}
            >
              {OPTION_LABELS[index] ?? String(index + 1)}
            </span>
            <span className="min-w-0 break-words">{option}</span>
          </button>
        );
      })}
    </div>
  );
}
