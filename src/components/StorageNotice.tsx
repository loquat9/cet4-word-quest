import type { StorageBackend } from '../types';

const MESSAGES: Record<Exclude<StorageBackend, 'indexeddb'>, string> = {
  localstorage:
    'IndexedDB 不可用，已降级为 localStorage；学习进度仍会保留，但容量有限。',
  memory:
    '浏览器存储不可用，本次会话的进度与成绩刷新后会丢失。请检查隐私模式或存储权限。',
};

interface StorageNoticeProps {
  backend: StorageBackend | null;
  error?: string | null;
}

/**
 * 存储降级提示条。仅在 IndexedDB 不可用或初始化失败时出现。
 */
export function StorageNotice({ backend, error }: StorageNoticeProps) {
  const message =
    error ??
    (backend && backend !== 'indexeddb' ? MESSAGES[backend] : null);

  if (!message) return null;

  const showRetry = Boolean(error) || backend !== 'indexeddb';

  return (
    <div
      role={backend === 'memory' || error ? 'alert' : 'status'}
      className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600"
    >
      <p className="min-w-0">{message}</p>
      {showRetry ? (
        <button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors duration-150 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          重新检测
        </button>
      ) : null}
    </div>
  );
}
