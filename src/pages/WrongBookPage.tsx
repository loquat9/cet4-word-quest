import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import { WrongWordItem } from '../components/wrongbook/WrongWordItem';
import {
  countDueWrongWords,
  MAX_REVIEW_STAGE,
  sortWrongWords,
} from '../game/reviewScheduler';
import { loadWrongWords } from '../services/review';
import type { WrongWordRecord } from '../types';

export function WrongBookPage() {
  const [records, setRecords] = useState<WrongWordRecord[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setRecords(null);
    setError(null);

    void loadWrongWords()
      .then((data) => {
        if (!active) return;
        setRecords(sortWrongWords(data));
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        console.error('[wrongbook] 加载失败', loadError);
        setError('错词本加载失败，请稍后重试。');
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const now = new Date();
  const sorted = useMemo(
    () => (records ? sortWrongWords(records) : []),
    [records],
  );
  const dueCount = useMemo(
    () => countDueWrongWords(sorted, now),
    [sorted, now],
  );
  const masteredCount = useMemo(
    () =>
      sorted.filter(
        (record) => record.reviewStage >= MAX_REVIEW_STAGE,
      ).length,
    [sorted],
  );

  const loading = records === null && error === null;
  const empty = records !== null && records.length === 0;

  return (
    <div>
      <PageHeader
        title="错词本"
        subtitle="答错的词会自动进入这里，按错误次数和最近错误时间排序。"
        backTo="/"
        backLabel="首页"
      />

      <Card className="animate-fade-in">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 px-2 py-3">
            <dt className="text-[11px] text-slate-500">总错词</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
              {records?.length ?? 0}
            </dd>
          </div>
          <div className="rounded-xl bg-primary-soft/40 px-2 py-3">
            <dt className="text-[11px] text-slate-500">待复习</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-primary">
              {dueCount}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-3">
            <dt className="text-[11px] text-slate-500">已掌握</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-success">
              {masteredCount}
            </dd>
          </div>
        </dl>

        {!loading && !empty && !error ? (
          <Link
            to="/play/review"
            className={buttonStyles(
              'primary',
              'lg',
              'mt-4 w-full',
            )}
          >
            开始复习
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={buttonStyles(
              'primary',
              'lg',
              'mt-4 w-full',
            )}
          >
            开始复习
          </button>
        )}

        <p className="mt-2 text-center text-[11px] leading-4 text-slate-400">
          {dueCount > 0
            ? `优先复习 ${dueCount} 个到期词，再补足薄弱词`
            : '暂无到期词，将优先复习错误次数最高的单词'}
        </p>
      </Card>

      {error ? (
        <Card className="mt-4 animate-fade-in text-center">
          <p className="text-sm font-medium text-slate-800">
            {error}
          </p>
          <button
            type="button"
            className={buttonStyles(
              'secondary',
              'md',
              'mt-4 w-full',
            )}
            onClick={() => {
              setReloadKey((value) => value + 1);
            }}
          >
            重新加载
          </button>
        </Card>
      ) : null}

      {loading ? (
        <Card className="mt-4 animate-fade-in text-center">
          <p className="text-sm text-slate-600">
            正在加载错词本…
          </p>
        </Card>
      ) : null}

      {empty ? (
        <Card className="mt-4 animate-fade-in text-center">
          <p className="text-4xl font-bold tabular-nums text-slate-200">
            0
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700">
            还没有错词
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">
            完成一局游戏后，答错的单词会自动收录，并在这里支持发音与专项复习。
          </p>
          <Link
            to="/map"
            className={buttonStyles(
              'primary',
              'lg',
              'mt-5 w-full',
            )}
          >
            去闯关
          </Link>
        </Card>
      ) : null}

      {!loading && !error && sorted.length > 0 ? (
        <Card className="mt-4 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              错词列表
            </h2>
            <span className="text-xs text-slate-400">
              {sorted.length} 个
            </span>
          </div>

          <ul className="mt-1 divide-y divide-slate-100">
            {sorted.map((record) => (
              <WrongWordItem
                key={record.wordId}
                record={record}
                now={now}
              />
            ))}
          </ul>
        </Card>
      ) : null}

      <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
        复习间隔：当天 → 1 天 → 3 天 → 7 天 → 30 天 ·
        答对推进，答错重置
      </p>
    </div>
  );
}
