import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
}

export function PageHeader({
  title,
  subtitle,
  backTo = '/',
  backLabel = '首页',
}: PageHeaderProps) {
  return (
    <header className="mb-5 animate-fade-in">
      <Link
        to={backTo}
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        <span aria-hidden="true" className="mr-1">
          ←
        </span>
        {backLabel}
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
      ) : null}
    </header>
  );
}
