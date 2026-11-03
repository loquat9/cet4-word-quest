import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ResultStars } from '../components/game/ResultStars';
import { PkResultPanel } from '../components/pk/PkResultPanel';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import { getLevelConfig } from '../data/levelConfig';
import {
  getNextLevelId,
  isReviewLevelId,
} from '../game/rules';
import {
  PK_SEED_MAX,
  comparePkResults,
  decodePkCode,
  encodePkCode,
  normalizePkCode,
  type PkComparison,
} from '../services/pk';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import type { RoundEndReason } from '../types';
import { formatDuration, formatPercent } from '../utils/format';

const END_REASON_LABELS: Record<RoundEndReason, string> = {
  completed: '完成全部题目',
  time: '时间到',
  hearts: '生命值耗尽',
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

export function ResultPage() {
  const { levelId = '' } = useParams<{ levelId: string }>();
  const level = getLevelConfig(levelId);
  const review = isReviewLevelId(levelId);
  const isPk = levelId === 'pk';
  const [searchParams] = useSearchParams();
  const gameResult = useGameStore((state) => state.result);
  const gameError = useGameStore((state) => state.error);
  const progress = usePlayerStore((state) => state.progress);
  const playerError = usePlayerStore((state) => state.error);
  const persistenceWarning = gameError ?? playerError;

  const result =
    gameResult?.levelId === levelId
      ? gameResult
      : progress.lastResult?.levelId === levelId
        ? progress.lastResult
        : null;

  if (!level || !result) {
    return (
      <div>
        <PageHeader
          title={
            isPk ? '对战结算' : review ? '复习结算' : '关卡结算'
          }
          subtitle="暂无可展示的本局成绩。"
          backTo={isPk ? '/pk' : review ? '/wrongbook' : '/map'}
          backLabel={
            isPk ? '好友 PK' : review ? '错词本' : '关卡地图'
          }
        />
        <Card>
          <p className="text-sm leading-6 text-slate-600">
            {isPk
              ? '还没有可展示的对战成绩，先发起或加入一局 PK 吧。'
              : review
                ? '还没有可展示的复习成绩，先开始一局错词复习吧。'
                : '请先完成一局关卡，再查看结算结果。'}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to={
                isPk
                  ? '/pk'
                  : review
                    ? '/play/review'
                    : `/play/${levelId}`
              }
              className={buttonStyles('primary', 'md', 'w-full')}
            >
              {isPk
                ? '返回好友 PK'
                : review
                  ? '开始复习'
                  : '开始本局'}
            </Link>
            <Link
              to={
                isPk
                  ? '/leaderboard'
                  : review
                    ? '/wrongbook'
                    : '/map'
              }
              className={buttonStyles('secondary', 'md', 'w-full')}
            >
              {isPk
                ? '查看排行榜'
                : review
                  ? '返回错词本'
                  : '返回关卡地图'}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (isPk) {
    const mode: 'create' | 'join' =
      searchParams.get('mode') === 'join' ? 'join' : 'create';
    const seedRaw = searchParams.get('seed');
    const seed = seedRaw === null ? Number.NaN : Number(seedRaw);
    const codeParam = normalizePkCode(
      searchParams.get('code') ?? '',
    );

    let code = '';
    let pkError: string | null = null;
    let comparison: PkComparison | null = null;

    if (mode === 'create') {
      if (
        !Number.isInteger(seed) ||
        seed < 0 ||
        seed > PK_SEED_MAX
      ) {
        pkError = '缺少有效的题目种子，无法生成对战码。';
      } else if (result.answeredCount <= 0) {
        pkError = '本局没有作答，无法生成对战码。';
      } else {
        try {
          code = encodePkCode({
            seed,
            correctCount: result.correctCount,
            answeredCount: result.answeredCount,
            durationSec: result.timeUsedSec,
          });
        } catch (encodeError) {
          console.error('[pk] 生成对战码失败', encodeError);
          pkError = '对战码生成失败，请重新发起对战。';
        }
      }
    } else {
      const target = decodePkCode(codeParam);

      if (!target) {
        pkError = '对战码无效或已损坏，请返回重新输入。';
      } else {
        code = codeParam;
        comparison = comparePkResults(
          {
            seed: target.seed,
            correctCount: result.correctCount,
            answeredCount: result.answeredCount,
            durationSec: result.timeUsedSec,
          },
          target,
        );
      }
    }

    return (
      <div>
        <PageHeader
          title="对战结算"
          subtitle={`好友 PK · ${
            END_REASON_LABELS[result.endReason]
          }`}
          backTo="/pk"
          backLabel="好友 PK"
        />

        {pkError ? (
          <Card className="animate-fade-in text-center">
            <p className="text-sm font-medium text-slate-800">
              无法展示对战结果
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {pkError}
            </p>
            <Link
              to="/pk"
              className={buttonStyles(
                'primary',
                'md',
                'mt-4 w-full',
              )}
            >
              返回好友 PK
            </Link>
          </Card>
        ) : (
          <PkResultPanel
            mode={mode}
            code={code}
            result={result}
            comparison={comparison}
          />
        )}

        <div className="mt-3 flex flex-col gap-2">
          <Link
            to="/pk"
            className={buttonStyles('primary', 'lg', 'w-full')}
          >
            再来一局
          </Link>
          <Link
            to="/leaderboard"
            className={buttonStyles('secondary', 'md', 'w-full')}
          >
            查看排行榜
          </Link>
          <Link
            to="/"
            className={buttonStyles('ghost', 'md', 'w-full')}
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const nextLevelId = review ? null : getNextLevelId(levelId);
  const canGoNext = Boolean(
    !review &&
      nextLevelId &&
      result.stars > 0 &&
      progress.unlockedLevelIds.includes(nextLevelId),
  );

  return (
    <div>
      <PageHeader
        title={review ? '复习结算' : '关卡结算'}
        subtitle={`${level.title} · ${
          END_REASON_LABELS[result.endReason]
        }`}
        backTo={review ? '/wrongbook' : '/map'}
        backLabel={review ? '错词本' : '关卡地图'}
      />

      <Card className="animate-fade-in text-center">
        <ResultStars stars={result.stars} />
        <p className="mt-3 text-sm font-medium text-slate-800">
          {result.stars > 0
            ? `获得 ${result.stars} 星`
            : '本局未获得星星'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          正确率达到 90% / 75% / 60% 可分别获得 3 / 2 / 1 星
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric
            label="正确率"
            value={formatPercent(result.accuracy)}
          />
          <Metric
            label="用时"
            value={formatDuration(result.timeUsedSec)}
          />
          <Metric
            label="答对 / 作答"
            value={`${result.correctCount} / ${result.answeredCount}`}
          />
          <Metric label="金币" value={`+${result.coins}`} />
          <Metric
            label="最大连击"
            value={`×${result.maxCombo}`}
          />
          <Metric label="得分" value={String(result.score)} />
        </div>
      </Card>

      <Card className="mt-3 animate-fade-in">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            新学单词
          </h2>
          <span className="text-xs text-slate-500">
            {result.learnedWords.length} 个
          </span>
        </div>

        {result.learnedWords.length > 0 ? (
          <ul className="mt-2 divide-y divide-slate-100">
            {result.learnedWords.map((word) => (
              <li key={word.wordId} className="py-2.5">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {word.word}
                  </p>
                  <p className="text-xs text-slate-400">
                    {word.phonetic}
                  </p>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  {word.meaning}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            本局没有新学单词。
          </p>
        )}
      </Card>

      <Card className="mt-3 animate-fade-in">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            本局错词
          </h2>
          <span className="text-xs text-slate-500">
            {result.wrongAnswers.length} 个
          </span>
        </div>

        {result.wrongAnswers.length > 0 ? (
          <ul className="mt-2 divide-y divide-slate-100">
            {result.wrongAnswers.map((word) => (
              <li key={word.wordId} className="py-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {word.word}
                  </p>
                  <p className="text-xs text-slate-400">
                    {word.phonetic}
                  </p>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  {word.meaning}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  正确答案：
                  <span className="font-medium text-slate-700">
                    {word.correctAnswer}
                  </span>
                  {word.selectedAnswer
                    ? ` · 你的选择：${word.selectedAnswer}`
                    : ''}
                </p>
                {word.example ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {word.example}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            本局没有错词，继续保持。
          </p>
        )}
      </Card>

      {persistenceWarning ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-danger">
          {persistenceWarning}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2">
        <Link
          to={review ? '/play/review' : `/play/${levelId}`}
          className={buttonStyles('primary', 'lg', 'w-full')}
        >
          {review ? '再复习一次' : '再来一次'}
        </Link>

        {review ? (
          <Link
            to="/wrongbook"
            className={buttonStyles('secondary', 'md', 'w-full')}
          >
            返回错词本
          </Link>
        ) : canGoNext && nextLevelId ? (
          <Link
            to={`/play/${nextLevelId}`}
            className={buttonStyles('secondary', 'md', 'w-full')}
          >
            下一关
          </Link>
        ) : (
          <Link
            to="/map"
            className={buttonStyles('secondary', 'md', 'w-full')}
          >
            返回关卡地图
          </Link>
        )}

        {!review ? (
          <Link
            to="/wrongbook"
            className={buttonStyles('ghost', 'md', 'w-full')}
          >
            查看错词本
          </Link>
        ) : null}
      </div>
    </div>
  );
}
