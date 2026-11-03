import type { ReactNode } from 'react';
import { Card } from './ui/Card';

interface PlaceholderPanelProps {
  badge?: string;
  title: string;
  description: string;
  children?: ReactNode;
}

/**
 * 阶段 0 统一占位面板。后续页面接入真实业务后逐步替换。
 */
export function PlaceholderPanel({
  badge = '阶段 0 · 占位',
  title,
  description,
  children,
}: PlaceholderPanelProps) {
  return (
    <Card className="animate-fade-in">
      <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
        {badge}
      </span>
      <h2 className="mt-3 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}
