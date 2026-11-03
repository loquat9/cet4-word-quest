import { useCallback, useEffect, useState } from 'react';
import {
  getWrongBookSummary,
  type WrongBookSummary,
} from '../services/review';

const EMPTY_SUMMARY: WrongBookSummary = {
  total: 0,
  due: 0,
  mastered: 0,
};

interface WrongBookSummaryState {
  summary: WrongBookSummary;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * 首页错词概览。只在首页挂载与窗口重新可见时读取，避免全站轮询。
 */
export function useWrongBookSummary(): WrongBookSummaryState {
  const [summary, setSummary] =
    useState<WrongBookSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const next = await getWrongBookSummary();
      setSummary(next);
      setError(null);
    } catch (loadError) {
      console.error('[wrongbook] 概览加载失败', loadError);
      setError('错词统计加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}
