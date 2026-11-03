import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

/**
 * 16px 圆角、弱阴影的单词卡 / 信息卡基础容器。
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-slate-200/80 bg-white p-5 shadow-card',
        className,
      )}
      {...props}
    />
  );
}
