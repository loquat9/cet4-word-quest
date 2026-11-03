import { create } from 'zustand';
import type { Settings } from '../types';
import { getStorage } from '../services/storage';
import { createDefaultSettings } from '../services/storage/defaults';

type EditableSettings = Pick<Settings, 'soundEnabled' | 'speechEnabled'>;

interface SettingsState {
  settings: Settings;
  hydrated: boolean;
  saving: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  updateSettings: (patch: Partial<EditableSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: createDefaultSettings(),
  hydrated: false,
  saving: false,
  error: null,

  hydrate: async () => {
    try {
      const storage = await getStorage();
      const settings = await storage.getSettings();
      set({ settings, hydrated: true, error: null });
    } catch (error) {
      console.error('[settings] 读取失败', error);
      set({
        hydrated: true,
        error: '设置读取失败，已使用默认设置',
      });
    }
  },

  updateSettings: async (patch) => {
    const previous = get().settings;
    const next: Settings = {
      ...previous,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    set({ settings: next, saving: true, error: null });

    try {
      const storage = await getStorage();
      await storage.saveSettings(next);
      set({ saving: false });
    } catch (error) {
      console.error('[settings] 保存失败', error);
      set({
        settings: previous,
        saving: false,
        error: '设置保存失败，请重试',
      });
    }
  },
}));
