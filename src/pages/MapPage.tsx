import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { LevelNode } from '../components/map/LevelNode';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import {
  CHAPTERS,
  LEVELS_PER_CHAPTER,
  TOTAL_LEVELS,
} from '../data/chapterConfig';
import { VOCABULARY_META } from '../data/cet4/meta';
import {
  getChapterLevelStates,
  getChapterMapStats,
  getNextPlayableLevelId,
  getOverallMapStats,
} from '../game/mapProgress';
import { LEVEL_RULES } from '../game/rules';
import { usePlayerStore } from '../store/playerStore';

export function MapPage() {
  const progress = usePlayerStore((state) => state.progress);
  const overall = getOverallMapStats(progress);
  const nextLevelId = getNextPlayableLevelId(progress);
  const allCompleted =
    overall.completedLevels === overall.totalLevels;

  return (
    <div>
      <PageHeader
        title="关卡地图"
        subtitle={`${CHAPTERS.length} 章 × ${LEVELS_PER_CHAPTER} 关，共 ${TOTAL_LEVELS} 关。通关解锁下一关。`}
        backTo="/"
        backLabel="首页"
      />

      <Card className="mb-3 animate-fade-in">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 px-2 py-3">
            <p className="text-base font-semibold tabular-nums text-primary">
              {overall.stars}
              <span className="text-xs font-normal text-slate-400">
                /{overall.maxStars}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">总星星</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-3">
            <p className="text-base font-semibold tabular-nums text-slate-900">
              {overall.unlockedLevels}
              <span className="text-xs font-normal text-slate-400">
                /{overall.totalLevels}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">已解锁</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-3">
            <p className="text-base font-semibold tabular-nums text-slate-900">
              {overall.completedLevels}
              <span className="text-xs font-normal text-slate-400">
                /{overall.totalLevels}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">已通关</p>
          </div>
        </div>

        <Link
          to={`/play/${nextLevelId}`}
          className={buttonStyles('primary', 'lg', 'mt-4 w-full')}
        >
          {allCompleted ? '再挑战一关' : '继续闯关'}
        </Link>
      </Card>

      <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
        当前词库：{VOCABULARY_META.isSample ? '示例库' : '完整库'} ·{' '}
        {VOCABULARY_META.totalWords} 词 · {CHAPTERS.length} 章
      </div>

      <div className="space-y-3">
        {CHAPTERS.map((chapter) => {
          const stats = getChapterMapStats(chapter.id, progress);
          const levelStates = getChapterLevelStates(
            chapter.id,
            progress,
          );

          return (
            <Card key={chapter.id} className="animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary">
                    第 {chapter.id} 章
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-slate-900">
                    {chapter.title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {chapter.subtitle}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] tabular-nums text-slate-500">
                    {chapter.loadedCount}/{chapter.targetCapacity} 词
                  </span>
                  <p className="mt-2 text-[11px] tabular-nums text-slate-400">
                    ★ {stats.stars}/{stats.maxStars} ·{' '}
                    {stats.completedLevels}/{stats.totalLevels} 关
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {levelStates.map((state) => (
                  <LevelNode key={state.levelId} state={state} />
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
        每关最多 3 星，正确率达到 90% / 75% / 60% 可分别获得 3 / 2 / 1
        星。至少 1 星通关后解锁下一关。Boss 关{' '}
        {LEVEL_RULES.boss.minQuestions}—{LEVEL_RULES.boss.maxQuestions}{' '}
        题、{LEVEL_RULES.boss.timeLimitSec / 60} 分钟。
      </div>
    </div>
  );
}
