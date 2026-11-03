import { useEffect, useState } from 'react';
import type { StorageBackend } from '../types';
import { getStorage } from '../services/storage';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';

interface BootstrapState {
  ready: boolean;
  backend: StorageBackend | null;
  error: string | null;
}

/**
 * 应用启动时先完成存储探测与两个 store 的水合，
 * 避免用户在数据加载完成前切换设置或触发写入。
 */
export function useAppBootstrap(): BootstrapState {
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const hydratePlayer = usePlayerStore((state) => state.hydrate);

  const [state, setState] = useState<BootstrapState>({
    ready: false,
    backend: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const storage = await getStorage();
        await Promise.all([hydrateSettings(), hydratePlayer()]);

        if (!cancelled) {
          setState({ ready: true, backend: storage.backend, error: null });
        }
      } catch (error) {
        console.error('[bootstrap] 初始化失败', error);
        if (!cancelled) {
          setState({
            ready: true,
            backend: null,
            error: '本地数据初始化失败，已进入临时模式',
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [hydrateSettings, hydratePlayer]);

  return state;
}
