import type { AnswerFeedback } from '../../types';
import { BASE_COIN_PER_CORRECT } from '../../game/scoring';
import { AudioButton } from './AudioButton';
import { Button } from '../ui/Button';

interface AnswerFeedbackProps {
  feedback: AnswerFeedback;
  hearts: number;
  onContinue: () => void;
}

export function AnswerFeedback({
  feedback,
  hearts,
  onContinue,
}: AnswerFeedbackProps) {
  const isCorrect = feedback.isCorrect;
  const coinGain =
    BASE_COIN_PER_CORRECT + feedback.comboBonusCoins;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        isCorrect
          ? 'animate-fade-in rounded-card border border-success/30 bg-green-50 p-4'
          : 'animate-fade-in rounded-card border border-danger/30 bg-red-50 p-4'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={
              isCorrect
                ? 'text-sm font-semibold text-green-800'
                : 'text-sm font-semibold text-red-800'
            }
          >
            {isCorrect ? '回答正确' : '回答错误'}
          </p>
          {isCorrect ? (
            <p className="mt-1 text-xs leading-5 text-green-700">
              连击 ×{feedback.combo} · +{coinGain} 金币
              {feedback.comboBonusCoins > 0
                ? `（含连击奖励 +${feedback.comboBonusCoins}）`
                : ''}
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-red-700">
              剩余生命：{hearts} / 3
            </p>
          )}
        </div>
        <span className="text-xs text-slate-500">
          将自动继续
        </span>
      </div>

      {!isCorrect ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-sm text-slate-800">
              正确答案：
              <span className="font-semibold">
                {feedback.correctAnswer}
              </span>
              <span className="ml-2 text-xs text-slate-500">
                {feedback.question.phonetic}
              </span>
            </p>
            <AudioButton
              text={feedback.question.audioText}
              size="sm"
              label="朗读单词"
              showError={false}
            />
          </div>
          {feedback.selectedAnswer ? (
            <p className="text-xs text-slate-500">
              {feedback.question.type === 'dictation'
                ? '你的拼写'
                : '你的选择'}
              ：{feedback.selectedAnswer}
            </p>
          ) : null}
          {feedback.question.example ? (
            <p className="text-sm leading-6 text-slate-700">
              {feedback.question.example}
            </p>
          ) : null}
          {feedback.question.exampleTranslation ? (
            <p className="text-xs leading-5 text-slate-500">
              {feedback.question.exampleTranslation}
            </p>
          ) : null}
        </div>
      ) : null}

      <Button
        variant={isCorrect ? 'primary' : 'secondary'}
        className="mt-3 w-full"
        onClick={onContinue}
      >
        继续
      </Button>
    </div>
  );
}
