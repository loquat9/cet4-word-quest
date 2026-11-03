import type { WrongWordRecord } from '../../types';
import { AudioButton } from '../game/AudioButton';
import { describeReviewStatus } from '../../game/reviewScheduler';
import { formatDateTime } from '../../utils/date';
import { cn } from '../../utils/cn';

interface WrongWordItemProps {
  record: WrongWordRecord;
  now?: Date;
}

/**
 * 错词列表条目：发音、释义、错误次数、最近错误时间与复习阶段。
 */
export function WrongWordItem({
  record,
  now = new Date(),
}: WrongWordItemProps) {
  const stage = Math.min(
    4,
    Math.max(0, Math.floor(record.reviewStage)),
  );
  const status = describeReviewStatus(record, now);
  const due = status === '今天复习' || status === '待抽查';
  const mastered = stage >= 4;

  return (
    <li className="py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-base font-semibold text-slate-900">
              {record.word}
            </p>
            <p className="text-xs text-slate-400">
              {record.phonetic}
            </p>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {record.meaning}
          </p>
        </div>

        <AudioButton
          text={record.word}
          size="sm"
          label="发音"
          showError={false}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <span>错 {record.wrongCount} 次</span>
        <span>最近 {formatDateTime(record.lastWrongAt)}</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-medium',
            due
              ? 'bg-primary-soft text-primary'
              : mastered
                ? 'bg-green-50 text-green-700'
                : 'bg-slate-100 text-slate-500',
          )}
        >
          {status}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <div
          className="flex gap-1"
          role="img"
          aria-label={`复习阶段 ${stage} / 4`}
        >
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={cn(
                'h-1 w-6 rounded-full',
                index < stage ? 'bg-primary' : 'bg-slate-100',
              )}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-400">
          阶段 {stage}/4
        </span>
      </div>
    </li>
  );
}
