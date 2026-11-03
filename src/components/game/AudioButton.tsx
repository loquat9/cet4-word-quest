import { SPEECH_MESSAGES } from '../../services/speech';
import { useSpeech } from '../../hooks/useSpeech';
import { cn } from '../../utils/cn';

export type AudioButtonSize = 'sm' | 'md' | 'lg';
export type AudioButtonVariant = 'outline' | 'primary';

interface AudioButtonProps {
  /** 交给语音合成的文本，通常是英文单词 */
  text: string;
  label?: string;
  size?: AudioButtonSize;
  variant?: AudioButtonVariant;
  className?: string;
  disabled?: boolean;
  /** 是否在按钮下方显示不可用/失败提示 */
  showError?: boolean;
}

const SIZE_CLASSES: Record<AudioButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-xs',
  md: 'h-10 gap-2 rounded-xl px-3.5 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-5 text-sm',
};

const VARIANT_CLASSES: Record<AudioButtonVariant, string> = {
  outline:
    'border border-slate-200 bg-white text-primary hover:border-primary/40 hover:bg-primary-soft/40',
  primary:
    'border border-primary bg-primary text-white hover:bg-primary-dark',
};

function SpeakerIcon({ speaking }: { speaking: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('h-4 w-4 shrink-0', speaking && 'opacity-80')}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path
        d={
          speaking
            ? 'M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12'
            : 'M16 9.5a3.5 3.5 0 0 1 0 5'
        }
      />
    </svg>
  );
}

/**
 * 发音按钮。
 * - 浏览器不支持时禁用并提示；
 * - 设置关闭发音时仍可点击，会返回明确的“已关闭”提示；
 * - 播放状态由全局 speech 服务驱动，切换题目时不会叠加声音。
 */
export function AudioButton({
  text,
  label = '播放发音',
  size = 'md',
  variant = 'outline',
  className,
  disabled = false,
  showError = true,
}: AudioButtonProps) {
  const { supported, enabled, speaking, errorMessage, speak } =
    useSpeech();
  const unavailable = !supported;
  const isDisabled = disabled || unavailable || !enabled;

  const statusMessage = unavailable
    ? SPEECH_MESSAGES.unsupported
    : !enabled
      ? SPEECH_MESSAGES.disabled
      : errorMessage;

  return (
    <div
      className={cn(
        'inline-flex flex-col items-start gap-1',
        className,
      )}
    >
      <button
        type="button"
        disabled={isDisabled}
        aria-label={speaking ? '正在播放发音' : label}
        onClick={() => {
          void speak(text);
        }}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          SIZE_CLASSES[size],
          VARIANT_CLASSES[variant],
        )}
      >
        <SpeakerIcon speaking={speaking} />
        <span>{speaking ? '播放中…' : label}</span>
      </button>

      {showError && statusMessage ? (
        <span
          role="status"
          className={cn(
            'text-[11px] leading-4',
            statusMessage === SPEECH_MESSAGES.disabled
              ? 'text-slate-500'
              : 'text-danger',
          )}
        >
          {statusMessage}
        </span>
      ) : null}
    </div>
  );
}
