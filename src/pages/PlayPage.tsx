import { useEffect, useRef, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { AnswerFeedback } from '../components/game/AnswerFeedback';
import { DictationInput } from '../components/game/DictationInput';
import { GameTopBar } from '../components/game/GameTopBar';
import { OptionGrid } from '../components/game/OptionGrid';
import { QuestionCard } from '../components/game/QuestionCard';
import { SpeechFallbackNotice } from '../components/game/SpeechFallbackNotice';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import { getLevelConfig } from '../data/levelConfig';
import { isReviewLevelId } from '../game/rules';
import { useCountdown } from '../hooks/useCountdown';
import { useGameSounds } from '../hooks/useGameSounds';
import { useSpeech } from '../hooks/useSpeech';
import { PK_SEED_MAX, decodePkCode } from '../services/pk';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';

export function PlayPage() {
  const { levelId = '' } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const liveGame = useGameStore();
  const speech = useSpeech();
  useGameSounds();
  const coins = usePlayerStore((state) => state.progress.coins);

  const level = getLevelConfig(levelId);
  const review = isReviewLevelId(levelId);
  const pk = levelId === 'pk';
  const [searchParams] = useSearchParams();

  const pkMode: 'create' | 'join' =
    searchParams.get('mode') === 'join' ? 'join' : 'create';
  const pkCode = searchParams.get('code') ?? '';
  const seedParamRaw = searchParams.get('seed');
  const seedParam =
    seedParamRaw === null ? Number.NaN : Number(seedParamRaw);
  const decodedPk =
    pk && pkMode === 'join' ? decodePkCode(pkCode) : null;
  const pkSeed = pk
    ? pkMode === 'join'
      ? decodedPk?.seed
      : Number.isInteger(seedParam) &&
          seedParam >= 0 &&
          seedParam <= PK_SEED_MAX
        ? seedParam
        : undefined
    : undefined;
  const pkInvalid = pk && pkSeed === undefined;

  const backTo = pk
    ? '/pk'
    : review
      ? '/wrongbook'
      : '/map';
  const backLabel = pk
    ? '好友 PK'
    : review
      ? '错词本'
      : '关卡地图';

  const question = liveGame.questions[liveGame.currentIndex];

  const hasPlayedRef = useRef(false);
  const [hintError, setHintError] = useState<string | null>(null);

  const countdown = useCountdown({
    deadline: liveGame.deadline,
    totalMs: level ? level.timeLimitSec * 1000 : 0,
    active:
      liveGame.status === 'playing' ||
      liveGame.status === 'feedback',
    onExpire: () => {
      void useGameStore.getState().finishRound('time');
    },
  });

  useEffect(() => {
    hasPlayedRef.current = false;
  }, [levelId, pkSeed]);

  useEffect(() => {
    if (!level || pkInvalid) return;

    if (level.kind === 'pk') {
      if (pkSeed === undefined) return;
      void liveGame.startRound(level.id, { seed: pkSeed });
      return;
    }

    void liveGame.startRound(level.id);
  }, [
    level?.id,
    liveGame.startRound,
    pkInvalid,
    pkSeed,
  ]);

  useEffect(() => {
    if (
      liveGame.status === 'playing' ||
      liveGame.status === 'feedback'
    ) {
      hasPlayedRef.current = true;
    }
  }, [liveGame.status]);

  useEffect(() => {
    if (liveGame.status !== 'feedback' || !liveGame.feedback) {
      return;
    }

    const timer = window.setTimeout(() => {
      useGameStore.getState().advance();
    }, liveGame.feedback.autoAdvanceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [liveGame.status, liveGame.feedback]);

  const questionId = question?.id;
  const questionType = question?.type;
  const audioText = question?.audioText;

  // 听音辨词 / 听写进入题目后自动播放；切题或离开页面先取消
  useEffect(() => {
    if (!questionId || !audioText) return;
    if (liveGame.status !== 'playing') return;
    if (
      questionType !== 'listen-to-word' &&
      questionType !== 'dictation'
    ) {
      return;
    }
    if (!speech.supported || !speech.enabled) return;

    const timer = window.setTimeout(() => {
      void speech.speak(audioText);
    }, 250);

    return () => {
      window.clearTimeout(timer);
      speech.cancel();
    };
  }, [
    questionId,
    questionType,
    audioText,
    liveGame.status,
    speech.supported,
    speech.enabled,
    speech.speak,
    speech.cancel,
  ]);

  // 提示状态随题目切换而清空
  useEffect(() => {
    setHintError(null);
  }, [questionId]);

  // 页面卸载时停止残留发音
  useEffect(() => {
    return () => {
      speech.cancel();
    };
  }, [speech.cancel]);

  useEffect(() => {
    if (
      liveGame.status === 'finished' &&
      hasPlayedRef.current
    ) {
      if (levelId === 'pk') {
        const params = new URLSearchParams();
        params.set('mode', pkMode);
        if (pkSeed !== undefined) {
          params.set('seed', String(pkSeed));
        }
        if (pkMode === 'join') {
          params.set('code', pkCode);
        }

        navigate(`/result/pk?${params.toString()}`, {
          replace: true,
        });
        return;
      }

      navigate(`/result/${levelId}`, { replace: true });
    }
  }, [
    liveGame.status,
    levelId,
    navigate,
    pkMode,
    pkSeed,
    pkCode,
  ]);

  function handleExit() {
    if (
      liveGame.status === 'playing' ||
      liveGame.status === 'feedback'
    ) {
      const confirmed = window.confirm(
        '退出本局？本局成绩不会保存。',
      );
      if (!confirmed) return;
    }

    speech.cancel();
    navigate(pk ? '/pk' : review ? '/wrongbook' : '/map');
  }

  async function handleHint() {
    if (!question) return;

    setHintError(null);
    const result = await liveGame.requestHint(question.id);

    if (result === 'insufficient') {
      setHintError(
        `金币不足，需要 ${level?.hintCostCoins ?? 0} 金币`,
      );
    } else if (result === 'error') {
      setHintError('金币扣除失败，请稍后重试');
    } else if (result === 'busy') {
      setHintError('正在扣除金币，请稍候');
    } else if (result === 'used') {
      setHintError('本题已使用过提示');
    }
  }

  if (!level) {
    return (
      <div>
        <PageHeader
          title="关卡不存在"
          subtitle="请从关卡地图选择有效关卡。"
          backTo="/map"
          backLabel="关卡地图"
        />
        <Card className="animate-fade-in">
          <p className="text-sm leading-6 text-slate-600">
            关卡编号无效，请返回地图重新选择。
          </p>
          <Link
            to="/map"
            className={buttonStyles('primary', 'md', 'mt-4 w-full')}
          >
            返回关卡地图
          </Link>
        </Card>
      </div>
    );
  }

  if (pkInvalid) {
    return (
      <div>
        <PageHeader
          title="好友 PK"
          subtitle="对战参数无效"
          backTo="/pk"
          backLabel="好友 PK"
        />
        <Card className="animate-fade-in">
          <p className="text-sm font-medium text-slate-800">
            无法开始对战
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {pkMode === 'join'
              ? '对战码无效或已损坏，请返回重新输入。'
              : '对战链接缺少题目种子，请重新发起对战。'}
          </p>
          <Link
            to="/pk"
            className={buttonStyles('primary', 'md', 'mt-4 w-full')}
          >
            返回好友 PK
          </Link>
        </Card>
      </div>
    );
  }

  if (liveGame.status === 'error') {
    return (
      <div>
        <PageHeader
          title={level.title}
          subtitle={
            pk
              ? '对战准备失败'
              : review
                ? '复习准备失败'
                : '题目加载失败'
          }
          backTo={backTo}
          backLabel={backLabel}
        />
        <Card className="animate-fade-in">
          <p className="text-sm font-medium text-slate-800">
            {pk
              ? '无法开始对战'
              : review
                ? '无法开始复习'
                : '无法开始本局'}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {liveGame.error ??
              (pk
                ? '对战题目生成失败，请重新发起。'
                : review
                  ? '错词本可能还没有可复习的单词。'
                  : '请检查词库文件或稍后重试。')}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              className={buttonStyles('primary', 'md', 'w-full')}
              onClick={() => {
                if (level.kind === 'pk') {
                  if (pkSeed !== undefined) {
                    void liveGame.startRound(level.id, {
                      seed: pkSeed,
                    });
                  }
                  return;
                }
                void liveGame.startRound(level.id);
              }}
            >
              重新加载
            </button>
            <Link
              to={backTo}
              className={buttonStyles('secondary', 'md', 'w-full')}
            >
              {pk
                ? '返回好友 PK'
                : review
                  ? '返回错词本'
                  : '返回关卡地图'}
            </Link>
            {review ? (
              <Link
                to="/map"
                className={buttonStyles('ghost', 'md', 'w-full')}
              >
                去闯关积累错词
              </Link>
            ) : null}
          </div>
        </Card>
      </div>
    );
  }

  if (
    liveGame.status === 'idle' ||
    liveGame.status === 'loading'
  ) {
    return (
      <div>
        <PageHeader
          title={level.title}
          subtitle={
            pk
              ? '正在准备同题对战'
              : review
                ? '正在整理错词并生成复习题'
                : '正在准备本局题目'
          }
          backTo={backTo}
          backLabel={backLabel}
        />
        <Card className="animate-fade-in text-center">
          <p className="text-sm text-slate-600">
            {pk
              ? '正在加载同题对战题目…'
              : review
                ? '正在加载词库并整理错词…'
                : '正在加载词库并生成题目…'}
          </p>
          <div className="mx-auto mt-4 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 rounded-full bg-primary" />
          </div>
        </Card>
      </div>
    );
  }

  if (liveGame.status === 'finished') {
    return (
      <div>
        <PageHeader
          title={level.title}
          subtitle="正在生成结算"
          backTo={backTo}
          backLabel={backLabel}
        />
        <Card className="animate-fade-in text-center">
          <p className="text-sm text-slate-600">
            本局已结束，正在生成结算…
          </p>
        </Card>
      </div>
    );
  }

  if (!question) {
    return (
      <div>
        <PageHeader
          title={level.title}
          subtitle="正在生成结算"
          backTo={backTo}
          backLabel={backLabel}
        />
        <Card className="animate-fade-in text-center">
          <p className="text-sm text-slate-600">
            本局已结束，正在生成结算…
          </p>
        </Card>
      </div>
    );
  }

  const isFeedback = liveGame.status === 'feedback';
  const hintRevealed = liveGame.hintUsedQuestionIds.includes(
    question.id,
  );

  return (
    <div>
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex min-h-11 items-center text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true" className="mr-1">
            ←
          </span>
          退出
        </button>
        <span className="min-w-0 truncate text-xs text-slate-400">
          {level.title}
        </span>
      </div>

      <GameTopBar
        hearts={liveGame.hearts}
        maxHearts={level.hearts}
        remainingSec={countdown.remainingSec}
        combo={liveGame.combo}
        currentIndex={liveGame.currentIndex}
        answeredCount={liveGame.answers.length}
        totalQuestions={liveGame.questions.length}
      />

      <SpeechFallbackNotice
        supported={speech.supported}
        enabled={speech.enabled}
        className="mt-3"
      />

      <div className="mt-3">
        <QuestionCard
          key={question.id}
          question={question}
          speechSupported={speech.supported}
          speechEnabled={speech.enabled}
        />
      </div>

      <div className="mt-3">
        {question.type === 'dictation' ? (
          <DictationInput
            key={question.id}
            hint={question.hint}
            hintRevealed={hintRevealed}
            hintCostCoins={level.hintCostCoins}
            coins={coins}
            hintPending={liveGame.hintPending}
            hintError={hintError}
            disabled={isFeedback}
            answerLength={question.answerLength}
            onSubmit={(answer) => {
              if (liveGame.status !== 'playing') return;
              liveGame.submitAnswer(answer);
            }}
            onRequestHint={() => {
              void handleHint();
            }}
          />
        ) : (
          <OptionGrid
            options={question.options}
            correctIndex={
              isFeedback ? question.correctIndex : null
            }
            selectedAnswer={
              isFeedback
                ? liveGame.feedback?.selectedAnswer ?? null
                : null
            }
            showResult={isFeedback}
            disabled={liveGame.status !== 'playing'}
            onSelect={(index) => {
              if (liveGame.status !== 'playing') return;
              liveGame.submitAnswer(index);
            }}
          />
        )}
      </div>

      {liveGame.feedback ? (
        <div className="mt-3">
          <AnswerFeedback
            feedback={liveGame.feedback}
            hearts={liveGame.hearts}
            onContinue={() => {
              liveGame.advance();
            }}
          />
        </div>
      ) : null}

      {liveGame.error ? (
        <p className="mt-3 text-xs leading-5 text-danger">
          {liveGame.error}
        </p>
      ) : null}
    </div>
  );
}
