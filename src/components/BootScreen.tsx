import { buttonStyles } from './ui/Button';

/**
 * 启动页。存储探测与水合期间展示，不使用旋转等装饰动画，
 * 仅保留 200ms 淡入，符合极简学习风。
 */
export function BootScreen({ error }: { error?: string | null }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-white px-6">
      <div className="animate-fade-in text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary">
          CET-4
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">四级词闯关</h1>
        <p className="mt-3 text-sm text-slate-500">
          {error ?? '正在加载本地学习数据…'}
        </p>
        {error ? (
          <>
            <p className="mt-2 text-xs leading-5 text-danger">
              请检查浏览器是否允许本地存储，或刷新页面重试。
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className={buttonStyles(
                'secondary',
                'md',
                'mt-4 w-full',
              )}
            >
              重新加载
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
