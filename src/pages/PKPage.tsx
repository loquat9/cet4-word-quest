import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Button, buttonStyles } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  PK_CODE_LENGTH,
  createPkSeed,
  decodePkCode,
  normalizePkCode,
} from '../services/pk';

const STEPS = [
  '发起对战，完成 12 道同题。',
  '把生成的 6 位对战码发给好友。',
  '好友输入对战码，完成后比较正确率与用时。',
];

export function PKPage() {
  const navigate = useNavigate();
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const normalizedCode = normalizePkCode(codeInput);

  function handleCreate() {
    const seed = createPkSeed();
    navigate(`/play/pk?mode=create&seed=${seed}`);
  }

  function handleJoin() {
    const challenge = decodePkCode(normalizedCode);

    if (!challenge) {
      setError('对战码无效，请检查 6 位字母数字。');
      return;
    }

    navigate(
      `/play/pk?mode=join&code=${normalizedCode}&seed=${challenge.seed}`,
    );
  }

  function handleCodeChange(value: string) {
    const next = value
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, '')
      .slice(0, PK_CODE_LENGTH);

    setCodeInput(next);
    setError(null);
  }

  return (
    <div>
      <PageHeader
        title="好友 PK"
        subtitle="用同一种子出题，结束后比较正确率与用时。"
        backTo="/"
        backLabel="首页"
      />

      <Card className="animate-fade-in">
        <p className="text-xs font-medium text-primary">发起对战</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          生成一局同题挑战
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          完成 12 道题后生成 6 位对战码，好友输入后即可挑战完全相同的题目。
        </p>
        <Button
          type="button"
          className="mt-4 w-full"
          onClick={handleCreate}
        >
          发起对战
        </Button>
      </Card>

      <Card className="mt-3 animate-fade-in">
        <label
          htmlFor="pk-code"
          className="text-xs font-medium text-slate-500"
        >
          输入好友的对战码
        </label>
        <input
          id="pk-code"
          type="text"
          inputMode="text"
          value={codeInput}
          maxLength={PK_CODE_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="例如 K3M9QZ"
          onChange={(event) => {
            handleCodeChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              handleJoin();
            }
          }}
          aria-describedby="pk-code-help"
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-center font-mono text-lg font-semibold uppercase tracking-[0.3em] text-slate-900 outline-none transition-colors duration-150 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <p
          id="pk-code-help"
          className="mt-1 text-[11px] leading-4 text-slate-400"
        >
          6 位字母数字，不区分大小写
        </p>

        {error ? (
          <p className="mt-2 text-xs leading-5 text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full"
          disabled={normalizedCode.length !== PK_CODE_LENGTH}
          onClick={handleJoin}
        >
          开始对战
        </Button>
      </Card>

      <Card className="mt-3 animate-fade-in">
        <h2 className="text-sm font-semibold text-slate-900">
          对战规则
        </h2>
        <ol className="mt-2 space-y-2">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-2 text-xs leading-5 text-slate-500"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] leading-5 text-slate-400">
          固定第 6 章 12 题、5 分钟、3 颗心。对战成绩不计入关卡进度，但计入每日任务与连续学习。
        </p>
      </Card>

      <Link
        to="/leaderboard"
        className={buttonStyles('ghost', 'md', 'mt-3 w-full')}
      >
        查看排行榜
      </Link>
    </div>
  );
}
