import { useEffect, useRef, useState } from 'react';

interface UseCountdownOptions {
  deadline: number | null;
  totalMs: number;
  active: boolean;
  onExpire: () => void;
}

interface CountdownState {
  remainingMs: number;
  remainingSec: number;
  remainingRatio: number;
}

/**
 * 基于 deadline 时间戳的倒计时。
 *
 * 使用 requestAnimationFrame 让进度条平滑，但剩余时间始终按 Date.now()
 * 计算，因此标签页挂起后恢复也不会累积漂移。组件卸载时取消动画帧。
 */
export function useCountdown({
  deadline,
  totalMs,
  active,
  onExpire,
}: UseCountdownOptions): CountdownState {
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);
  const [remainingMs, setRemainingMs] = useState(() =>
    deadline === null ? 0 : Math.max(0, deadline - Date.now()),
  );

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    let frameId = 0;
    let lastUpdate = 0;
    let cancelled = false;

    expiredRef.current = false;

    const updateRemaining = () => {
      const next =
        deadline === null
          ? 0
          : Math.max(0, deadline - Date.now());
      setRemainingMs(next);
    };

    updateRemaining();

    if (!active || deadline === null) {
      return () => {
        cancelled = true;
      };
    }

    const tick = (timestamp: number) => {
      if (cancelled) return;

      const remaining =
        deadline === null
          ? 0
          : Math.max(0, deadline - Date.now());

      if (remaining === 0 || timestamp - lastUpdate >= 100) {
        lastUpdate = timestamp;
        setRemainingMs(remaining);
      }

      if (remaining === 0) {
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current();
        }
        return;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [active, deadline]);

  const remainingRatio =
    totalMs > 0
      ? Math.max(0, Math.min(1, remainingMs / totalMs))
      : 0;

  return {
    remainingMs,
    remainingSec: Math.ceil(remainingMs / 1000),
    remainingRatio,
  };
}
