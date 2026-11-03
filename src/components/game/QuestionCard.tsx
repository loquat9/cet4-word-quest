import type { Question } from '../../types';
import {
  QUESTION_TYPE_DESCRIPTIONS,
  QUESTION_TYPE_LABELS,
} from '../../data/questionTypeWeights';
import { AudioButton } from './AudioButton';
import { Card } from '../ui/Card';

interface QuestionCardProps {
  question: Question;
  speechSupported: boolean;
  speechEnabled: boolean;
}

function getDescription(
  question: Question,
  speechAvailable: boolean,
): string {
  if (question.type === 'listen-to-word' && !speechAvailable) {
    return '发音不可用，根据中文释义选择正确的英文单词';
  }

  if (question.type === 'dictation' && !speechAvailable) {
    return '根据中文释义输入完整单词';
  }

  return QUESTION_TYPE_DESCRIPTIONS[question.type];
}

/**
 * 单词卡：按五类题型切换主体展示。
 * 听音题在发音不可用时降级为中文释义，保证仍可作答。
 */
export function QuestionCard({
  question,
  speechSupported,
  speechEnabled,
}: QuestionCardProps) {
  const speechAvailable = speechSupported && speechEnabled;

  return (
    <Card className="min-h-44 animate-fade-in">
      <p className="text-xs font-medium text-primary">
        {QUESTION_TYPE_LABELS[question.type]}
      </p>

      {question.type === 'word-to-meaning' ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="break-words text-4xl font-bold tracking-tight text-slate-900">
              {question.word}
            </h2>
            <AudioButton
              text={question.audioText}
              size="sm"
              label="发音"
              showError={false}
            />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {question.phonetic}
          </p>
        </>
      ) : null}

      {question.type === 'meaning-to-word' ? (
        <h2 className="mt-4 break-words text-xl font-semibold leading-8 text-slate-900">
          {question.meaning}
        </h2>
      ) : null}

      {question.type === 'listen-to-word' ? (
        speechAvailable ? (
          <div className="mt-4 flex flex-col items-center text-center">
            <AudioButton
              text={question.audioText}
              size="lg"
              variant="primary"
              label="播放发音"
              showError={false}
            />
            <p className="mt-3 text-xs leading-5 text-slate-400">
              可随时重播
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-xl bg-primary-soft/40 px-3 py-2 text-xs leading-5 text-slate-500">
              发音不可用，已显示中文释义
            </div>
            <h2 className="mt-3 break-words text-xl font-semibold leading-8 text-slate-900">
              {question.meaning}
            </h2>
          </>
        )
      ) : null}

      {question.type === 'example-fill' ? (
        <p className="mt-4 break-words text-lg font-medium leading-8 text-slate-900">
          {question.prompt}
        </p>
      ) : null}

      {question.type === 'dictation' ? (
        <div className="mt-4 flex items-center gap-3">
          <AudioButton
            text={question.audioText}
            size="md"
            label="播放发音"
            showError={false}
          />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400">中文释义</p>
            <p className="break-words text-lg font-semibold leading-7 text-slate-900">
              {question.meaning}
            </p>
          </div>
        </div>
      ) : null}

      <p className="mt-5 text-xs leading-5 text-slate-500">
        {getDescription(question, speechAvailable)}
      </p>
    </Card>
  );
}
