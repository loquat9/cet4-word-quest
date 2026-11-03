import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { buttonStyles } from './ui/Button';
import { Card } from './ui/Card';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * 全局渲染异常兜底。
 * 只捕获 React 渲染/生命周期错误；异步存储错误仍由各页面错误态处理。
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[app] 页面渲染异常', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const homeHref = import.meta.env.BASE_URL || '/';

    return (
      <div className="py-10">
        <Card className="animate-fade-in text-center">
          <p className="text-xs font-medium text-danger">页面异常</p>
          <h1 className="mt-2 text-xl font-bold text-slate-900">
            页面出现了一点问题
          </h1>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            本地学习进度仍保存在浏览器中。可以重新加载页面，或返回首页继续。
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className={buttonStyles('primary', 'md', 'w-full')}
            >
              重新加载
            </button>
            <a
              href={homeHref}
              className={buttonStyles('secondary', 'md', 'w-full')}
            >
              返回首页
            </a>
          </div>
        </Card>
      </div>
    );
  }
}
