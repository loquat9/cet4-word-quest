import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface DictationInputProps {
  /** 首字母提示，如 "a _ _ _ _ _ _" */
  hint?: string;
  hintRevealed: boolean;
  hintCostCoins: number;
  coins: number;
  hintPending: boolean;
  hintError?: string | null;
  disabled: boolean;
  answerLength?: number;
  onSubmit: (answer: string) => void;
  onRequestHint: () => void;
}

function HintIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 2.1h5.2c0-.9.3-1.6.9-2.1A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

/**
 * 听写输入区。
 *
 * - 回车提交；显式判断 nativeEvent.isComposing 与 keyCode 229，避免中文输入法
 *   在候选词确认阶段误提交；
 * - 忽略首尾空格，空输入不可提交；
 * - 首字母提示每题限一次，金币由 gameStore 统一扣除。
 */
export function DictationInput({
  hint,
  hintRevealed,
  hintCostCoins,
  coins,
  hintPending,
  hintError,
  disabled,
  answerLength,
  onSubmit,
  onRequestHint,
}: DictationInputProps) {
  const [value, setValue] = useState('');
  const composingRef = useRef(false);
  const submittedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTimerRef = useRef<number | null>(null);
  const inputId = useId();
  const helperId = useId();

  const scrollInputIntoView = useCallback(() => {
    const input = inputRef.current;

    if (!input || document.activeElement !== input) return;

    input.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    function handleViewportResize() {
      if (document.activeElement !== inputRef.current) return;

      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current);
      }

      focusTimerRef.current = window.setTimeout(() => {
        scrollInputIntoView();
      }, 80);
    }

    viewport.addEventListener('resize', handleViewportResize);

    return () => {
      viewport.removeEventListener('resize', handleViewportResize);

      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current);
      }
    };
  }, [scrollInputIntoView]);

  function handleFocus() {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
    }

    focusTimerRef.current = window.setTimeout(() => {
      scrollInputIntoView();
    }, 250);
  }

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && !disabled;
  const insufficientCoins =
    !hintRevealed && !hintPending && coins < hintCostCoins;

  function submit() {
    if (!canSubmit || submittedRef.current) return;
    submittedRef.current = true;
    inputRef.current?.blur();
    onSubmit(trimmed);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (composingRef.current) return;
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;

    // 输入法组合态：不要提交，让 Enter 用于确认候选词
    if (
      event.nativeEvent.isComposing ||
      event.keyCode === 229 ||
      composingRef.current
    ) {
      return;
    }

    event.preventDefault();
    submit();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor={inputId} className="sr-only">
          输入你听到的单词
        </label>
        <input
          id={inputId}
          ref={inputRef}
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onFocus={handleFocus}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={(answerLength ?? 24) + 8}
          placeholder="输入你听到的单词"
          aria-describedby={helperId}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-base font-semibold tracking-wide text-slate-900 transition-colors duration-150 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-500"
        />

        <Button
          type="submit"
          size="md"
          disabled={!canSubmit}
          className="mt-2 w-full"
        >
          确认
        </Button>

        <p
          id={helperId}
          className="mt-2 text-center text-[11px] leading-4 text-slate-400"
        >
          回车提交 · 忽略大小写与首尾空格
        </p>
      </form>

      {hintRevealed ? (
        <div className="mt-3 rounded-xl bg-primary-soft/40 px-3 py-2">
          <p className="text-[11px] text-slate-500">首字母提示</p>
          <p className="mt-1 break-words font-mono text-base tracking-[0.2em] text-slate-800">
            {hint ?? '—'}
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={
            disabled ||
            hintRevealed ||
            hintPending ||
            insufficientCoins
          }
          onClick={onRequestHint}
          className={cn(
            'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            hintRevealed
              ? 'border-success/30 bg-green-50 text-green-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary',
          )}
        >
          <HintIcon />
          {hintRevealed
            ? '已使用提示'
            : hintPending
              ? '正在扣除金币…'
              : `首字母提示 · ${hintCostCoins} 金币`}
        </button>

        <span className="shrink-0 text-xs text-slate-400">
          金币 {coins}
        </span>
      </div>

      {insufficientCoins ? (
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          金币不足，当前 {coins} 金币
        </p>
      ) : null}

      {hintError ? (
        <p className="mt-1 text-[11px] leading-4 text-danger">
          {hintError}
        </p>
      ) : null}
    </div>
  );
}
