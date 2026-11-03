import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Toggle } from '../components/ui/Toggle';
import { VOCABULARY_META } from '../data/cet4/meta';
import { computeLearningStats } from '../game/learningStats';
import {
  loadAllChapters,
  VocabularyLoadError,
} from '../services/vocabulary';
import { getStorage } from '../services/storage';
import {
  SOUND_EFFECT_LABELS,
  isSoundSupported,
  playSound,
  primeSound,
  type SoundEffect,
} from '../services/sound';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import type { StorageBackend } from '../types';
import { formatTime } from '../utils/date';
import { formatPercent } from '../utils/format';

const SOUND_PREVIEWS: readonly SoundEffect[] = [
  'correct',
  'wrong',
  'complete',
];

const BACKEND_LABELS: Record<StorageBackend, string> = {
  indexeddb: 'IndexedDB',
  localstorage: 'localStorage（降级）',
  memory: '内存（不持久）',
};

type VocabularyCheckState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; chapters: number; words: number }
  | { status: 'error'; message: string; details: string[] };

export function SettingsPage() {
  const settings = useSettingsStore((state) => state.settings);
  const saving = useSettingsStore((state) => state.saving);
  const settingsError = useSettingsStore((state) => state.error);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  const resetProgress = usePlayerStore((state) => state.resetProgress);
  const resetting = usePlayerStore((state) => state.resetting);
  const playerError = usePlayerStore((state) => state.error);
  const progress = usePlayerStore((state) => state.progress);
  const stats = computeLearningStats(progress);

  const [backend, setBackend] = useState<StorageBackend | null>(null);
  const [soundSupported] = useState(isSoundSupported);
  const [vocabularyCheck, setVocabularyCheck] =
    useState<VocabularyCheckState>({ status: 'idle' });

  useEffect(() => {
    let active = true;

    void getStorage()
      .then((storage) => {
        if (active) setBackend(storage.backend);
      })
      .catch(() => {
        if (active) setBackend(null);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleReset() {
    const confirmed = window.confirm(
      '确定重置学习进度与错词吗？设置会保留。',
    );
    if (!confirmed) return;
    void resetProgress();
  }

  async function handleVocabularyCheck() {
    setVocabularyCheck({ status: 'loading' });

    try {
      const chapters = await loadAllChapters();
      const words = chapters.reduce(
        (total, chapter) => total + chapter.words.length,
        0,
      );
      setVocabularyCheck({
        status: 'success',
        chapters: chapters.length,
        words,
      });
    } catch (error) {
      if (error instanceof VocabularyLoadError) {
        setVocabularyCheck({
          status: 'error',
          message: error.message,
          details: [...error.issues],
        });
        return;
      }

      setVocabularyCheck({
        status: 'error',
        message: '词库加载失败',
        details: [
          error instanceof Error ? error.message : String(error),
        ],
      });
    }
  }

  const chapterCounts = Array.from({ length: 6 }, (_, index) => {
    const chapter = String(index + 1);
    return `${chapter} 章 ${VOCABULARY_META.chapters[chapter] ?? 0} 词`;
  }).join(' · ');

  return (
    <div>
      <PageHeader
        title="设置"
        subtitle="调整音效与发音偏好，查看本地数据状态。"
      />

      <Card className="animate-fade-in">
        <h2 className="text-sm font-semibold text-slate-900">偏好设置</h2>

        <div className="mt-2 divide-y divide-slate-100">
          <Toggle
            label="音效"
            description="答对、答错与通关提示音"
            checked={settings.soundEnabled}
            disabled={saving}
            onChange={(checked) => {
              void updateSettings({ soundEnabled: checked });
            }}
          />
          <Toggle
            label="发音"
            description="听音辨词、听写与单词发音按钮"
            checked={settings.speechEnabled}
            disabled={saving}
            onChange={(checked) => {
              void updateSettings({ speechEnabled: checked });
            }}
          />
        </div>

        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-600">
              音效试听
            </p>
            <span
              className={
                soundSupported
                  ? 'text-[11px] text-slate-400'
                  : 'text-[11px] text-danger'
              }
            >
              {!soundSupported
                ? '当前浏览器不支持音效'
                : !settings.soundEnabled
                  ? '开启音效后可试听'
                  : '轻提示音 · 可静音'}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {SOUND_PREVIEWS.map((effect) => (
              <button
                key={effect}
                type="button"
                disabled={!settings.soundEnabled || !soundSupported}
                onClick={() => {
                  primeSound();
                  playSound(effect);
                }}
                className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition-colors duration-150 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {SOUND_EFFECT_LABELS[effect]}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400" role="status">
          {settingsError ? (
            <span className="text-danger">{settingsError}</span>
          ) : saving ? (
            '正在保存…'
          ) : (
            `最近保存 ${formatTime(settings.updatedAt)}`
          )}
        </p>
      </Card>

      <Card className="mt-3 animate-fade-in">
        <h2 className="text-sm font-semibold text-slate-900">本地数据</h2>

        <dl className="mt-2 divide-y divide-slate-100 text-sm">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-slate-500">存储后端</dt>
            <dd className="font-medium text-slate-800">
              {backend ? BACKEND_LABELS[backend] : '检测中…'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-slate-500">进度持久化</dt>
            <dd className="font-medium text-slate-800">
              {backend === 'memory' ? '仅本次会话' : '刷新后保留'}
            </dd>
          </div>
        </dl>

        <Button
          variant="danger"
          onClick={handleReset}
          disabled={resetting}
          className="mt-3 w-full"
        >
          {resetting ? '正在重置…' : '重置学习进度'}
        </Button>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          将清空关卡进度、金币、错词与每日任务，保留设置。排行榜记录将在阶段 5
          接入后单独处理。
        </p>
        {playerError ? (
          <p className="mt-1 text-xs text-danger">{playerError}</p>
        ) : null}
      </Card>

      <Card className="mt-3 animate-fade-in">
        <h2 className="text-sm font-semibold text-slate-900">
          学习统计
        </h2>

        <dl className="mt-2 divide-y divide-slate-100 text-sm">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-slate-500">累计学习</dt>
            <dd className="font-medium tabular-nums text-slate-800">
              {stats.learnedWords}/{stats.totalWords}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-slate-500">总正确率</dt>
            <dd className="font-medium tabular-nums text-slate-800">
              {formatPercent(stats.accuracy)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-slate-500">连续学习</dt>
            <dd className="font-medium tabular-nums text-slate-800">
              {stats.streakDays} 天
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-slate-500">通关</dt>
            <dd className="font-medium tabular-nums text-slate-800">
              {stats.completedLevels}/{stats.totalLevels}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-slate-500">总星星</dt>
            <dd className="font-medium tabular-nums text-slate-800">
              {stats.totalStars}/{stats.maxStars}
            </dd>
          </div>
        </dl>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {stats.chapterStars.map((chapter) => (
            <div
              key={chapter.chapter}
              className="rounded-xl bg-slate-50 px-2 py-2 text-center"
            >
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {chapter.stars}/{chapter.maxStars}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                第 {chapter.chapter} 章
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-3 animate-fade-in">
        <h2 className="text-sm font-semibold text-slate-900">词库信息</h2>
        <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
          <p className="text-sm font-medium text-slate-800">
            {VOCABULARY_META.isSample
              ? 'CET-4 示例词库'
              : 'CET-4 完整词库'}
          </p>
          <p>
            版本：{VOCABULARY_META.version} · 共{' '}
            {VOCABULARY_META.totalWords} 词 / 6 章
          </p>
          <p>{chapterCounts}</p>
          <p>完整词库目标：每章 700—800 词。</p>
        </div>

        <div className="mt-3" aria-live="polite">
          <Button
            variant="secondary"
            className="w-full"
            disabled={vocabularyCheck.status === 'loading'}
            onClick={() => {
              void handleVocabularyCheck();
            }}
          >
            {vocabularyCheck.status === 'loading'
              ? '正在检查词库…'
              : '检查词库'}
          </Button>

          {vocabularyCheck.status === 'idle' ? (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              点击检查 6 章 JSON 是否可正常加载；首次检查会按章懒加载。
            </p>
          ) : null}

          {vocabularyCheck.status === 'success' ? (
            <p className="mt-2 text-xs font-medium text-success">
              {vocabularyCheck.chapters} 章 / {vocabularyCheck.words}{' '}
              词，校验通过
            </p>
          ) : null}

          {vocabularyCheck.status === 'error' ? (
            <div className="mt-2 text-xs leading-5 text-danger">
              <p className="font-medium">{vocabularyCheck.message}</p>
              {vocabularyCheck.details.length > 0 ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {vocabularyCheck.details
                    .slice(0, 6)
                    .map((detail, index) => (
                      <li key={`${index}-${detail}`}>{detail}</li>
                    ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      <p className="mt-5 text-center text-xs text-slate-400">
        四级词闯关 v0.1.0 · 阶段 6
      </p>
    </div>
  );
}
