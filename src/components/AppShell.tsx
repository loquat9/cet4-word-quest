import type { ReactNode } from 'react';

/**
 * 全站移动端容器：桌面端居中，最大宽度 480px，并处理底部安全区。
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-5 sm:px-6">
        {children}
      </div>
    </div>
  );
}
