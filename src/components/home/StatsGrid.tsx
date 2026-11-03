import type { LearningStats } from '../../game/learningStats';
import { formatPercent } from '../../utils/format';

interface StatsGridProps {
  stats: LearningStats;
  coins: number;
}

/**
 * 首页学习统计网格：金币、累计学习、连续天数、正确率、通关、星星。
 */
export function StatsGrid({ stats, coins }: StatsGridProps) {
  const cells = [
    {
      label: '金币',
      value: String(coins),
    },
    {
      label: '累计学习',
      value: `${stats.learnedWords}/${stats.totalWords}`,
    },
    {
      label: '连续学习',
      value: `${stats.streakDays} 天`,
    },
    {
      label: '正确率',
      value: formatPercent(stats.accuracy),
    },
    {
      label: '通关',
      value: `${stats.completedLevels}/${stats.totalLevels}`,
    },
    {
      label: '总星星',
      value: `${stats.totalStars}/${stats.maxStars}`,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-xl bg-slate-50 px-2 py-3"
        >
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {cell.value}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {cell.label}
          </p>
        </div>
      ))}
    </div>
  );
}
