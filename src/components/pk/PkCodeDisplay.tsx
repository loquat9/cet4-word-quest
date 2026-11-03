import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

interface PkCodeDisplayProps {
  code: string;
  label?: string;
  hint?: string;
  className?: string;
}

type CopyState = 'idle' | 'copied' | 'error';

/**
 * 6 位对战码展示与复制。
 * 无 Clipboard API 时保留可手动选中的文本。
 */
export function PkCodeDisplay({
  code,
  label = '对战码',
  hint,
  className,
}: PkCodeDisplayProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setCopyState('idle');
    }, 1600);
  }

  return (
    <div className={cn('text-center', className)}>
      <p className="text-[11px] font-medium text-slate-500">
        {label}
      </p>

      <div
        className="mt-2 grid grid-cols-6 gap-1.5"
        aria-label={`${label} ${code}`}
      >
        {code.split('').map((character, index) => (
          <span
            key={`${index}-${character}`}
            className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-mono text-xl font-bold text-slate-900"
          >
            {character}
          </span>
        ))}
      </div>

      <div className="mt-2 flex min-h-8 items-center justify-center gap-2">
        {hint ? (
          <p className="text-[11px] leading-4 text-slate-400">
            {hint}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void handleCopy();
          }}
          className="inline-flex min-h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 transition-colors duration-150 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          {copyState === 'copied'
            ? '已复制'
            : copyState === 'error'
              ? '请手动复制'
              : '复制'}
        </button>
      </div>
    </div>
  );
}
