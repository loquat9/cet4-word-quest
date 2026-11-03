import { cn } from '../../utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * 设置开关。外层按钮高度 44px，满足移动端触控要求。
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleProps) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-11 w-14 shrink-0 items-center rounded-full transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-1 top-1/2 h-7 w-12 -translate-y-1/2 rounded-full transition-colors duration-200',
            checked ? 'bg-primary' : 'bg-slate-200',
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'relative h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-2',
          )}
        />
      </button>
    </div>
  );
}
