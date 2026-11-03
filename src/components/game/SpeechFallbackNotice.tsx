import { cn } from '../../utils/cn';

interface SpeechFallbackNoticeProps {
  supported: boolean;
  enabled: boolean;
  className?: string;
}

/**
 * 发音不可用时的统一提示。
 * 不阻塞答题：听音题会由 QuestionCard 切换为中文释义展示。
 */
export function SpeechFallbackNotice({
  supported,
  enabled,
  className,
}: SpeechFallbackNoticeProps) {
  if (supported && enabled) return null;

  return (
    <div
      role="status"
      className={cn(
        'rounded-xl border border-primary/15 bg-primary-soft/40 px-3 py-2 text-xs leading-5 text-slate-600',
        className,
      )}
    >
      {!supported
        ? '当前浏览器不支持发音，听音题已切换为看义选词，听写题请根据释义作答。'
        : '发音已在设置中关闭，听音题当前显示中文释义。可在设置中重新开启。'}
    </div>
  );
}
