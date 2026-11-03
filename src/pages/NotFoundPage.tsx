import { Link } from 'react-router-dom';
import { buttonStyles } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex flex-1 animate-fade-in flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl font-bold tabular-nums text-slate-200">404</p>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        页面不存在
      </h1>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        这个地址没有对应页面，请从首页重新进入。
      </p>
      <Link
        to="/"
        className={buttonStyles('primary', 'md', 'mt-6 min-w-32')}
      >
        返回首页
      </Link>
    </div>
  );
}
