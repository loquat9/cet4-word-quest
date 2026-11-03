import type { RoundResult } from '../../types';
import type { PkComparison, PkOutcome } from '../../services/pk';
import { PkCodeDisplay } from './PkCodeDisplay';
import { Card } from '../ui/Card';
import { formatDuration, formatPercent } from '../../utils/format';
import { cn } from '../../utils/cn';

interface PkResultPanelProps {
  mode: 'create' | 'join';
  code: string;
  result: RoundResult;
  comparison?: PkComparison | null;
}

const OUTCOME_LABELS: Record<
  PkOutcome,
  { title: string; className: string }
> = {
  win: { title: '挑战成功', className: 'text-success' },
  lose: { title: '惜败', className: 'text-danger' },
  draw: { title: '平局', className: 'text-slate-700' },
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
      <p className="text-base font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function CompareCell({
  title,
  accuracy,
  durationSec,
  highlight,
}: {
  title: string;
  accuracy: number;
  durationSec: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl px-3 py-3 text-center',
        highlight ? 'bg-primary-soft/50' : 'bg-slate-50',
      )}
    >
      <p className="text-[11px] text-slate-500">{title}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
        {formatPercent(accuracy)}
      </p>
      <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
        {formatDuration(durationSec)}
      </p>
    </div>
  );
}

/**
 * PK 结算面板。
 * 发起方展示对战码；参与方展示双方对比。
 */
export function PkResultPanel({
  mode,
  code,
  result,
  comparison,
}: PkResultPanelProps) {
  if (mode === 'create') {
    return (
      <Card className="animate-fade-in">
        <p className="text-xs font-medium text-primary">
          挑战已创建
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          把对战码发给好友
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          好友输入同一码后，会使用完全相同的题目与顺序。
        </p>

        <PkCodeDisplay
          code={code}
          label="你的对战码"
          hint="好友输入后即可挑战"
          className="mt-4"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric
            label="正确率"
            value={formatPercent(result.accuracy)}
          />
          <Metric
            label="用时"
            value={formatDuration(result.timeUsedSec)}
          />
        </div>
      </Card>
    );
  }

  if (!comparison) {
    return (
      <Card className="animate-fade-in text-center">
        <p className="text-sm text-danger">
          无法解析本局对战码，请返回好友 PK 重新输入。
        </p>
      </Card>
    );
  }

  const outcome = OUTCOME_LABELS[comparison.outcome];

  return (
    <Card className="animate-fade-in">
      <p className="text-xs font-medium text-slate-500">
        对战结果
      </p>
      <h2
        className={cn(
          'mt-1 text-2xl font-bold tracking-tight',
          outcome.className,
        )}
      >
        {outcome.title}
      </h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        正确率优先，其次比较用时。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <CompareCell
          title="我"
          accuracy={comparison.playerAccuracy}
          durationSec={comparison.playerDurationSec}
          highlight
        />
        <CompareCell
          title="好友"
          accuracy={comparison.targetAccuracy}
          durationSec={comparison.targetDurationSec}
        />
      </div>

      <p className="mt-2 text-center text-[11px] text-slate-400">
        我 {comparison.playerCorrect}/{comparison.playerAnswered}
        题 · 好友 {comparison.targetCorrect}/
        {comparison.targetAnswered} 题
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <PkCodeDisplay
          code={code}
          label="本局对战码"
          hint="好友可用同一码再战"
        />
      </div>
    </Card>
  );
}
