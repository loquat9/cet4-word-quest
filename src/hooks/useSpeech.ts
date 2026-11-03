import { useCallback, useState, useSyncExternalStore } from 'react';
import {
  SPEECH_MESSAGES,
  cancelSpeech,
  isSpeaking,
  isSpeechSupported,
  speak as speakText,
  subscribeSpeech,
  type SpeechFailureReason,
} from '../services/speech';
import { useSettingsStore } from '../store/settingsStore';

export interface UseSpeechOptions {
  rate?: number;
  lang?: string;
}

export interface UseSpeechResult {
  /** 浏览器是否支持语音合成 */
  supported: boolean;
  /** 设置中的发音开关 */
  enabled: boolean;
  /** 当前是否有发音在播放 */
  speaking: boolean;
  error: SpeechFailureReason | null;
  errorMessage: string | null;
  /** 成功返回 true；被禁用、取消或失败返回 false */
  speak: (text: string) => Promise<boolean>;
  cancel: () => void;
}

/**
 * 发音 Hook：合并能力检测、设置开关与播放状态。
 * 播放失败不会抛异常，调用方只需根据返回值或 errorMessage 展示提示。
 */
export function useSpeech(options: UseSpeechOptions = {}): UseSpeechResult {
  const enabled = useSettingsStore(
    (state) => state.settings.speechEnabled,
  );
  const [supported] = useState(isSpeechSupported);
  const [error, setError] = useState<SpeechFailureReason | null>(
    null,
  );
  const speaking = useSyncExternalStore(
    subscribeSpeech,
    isSpeaking,
    () => false,
  );

  const rate = options.rate ?? 0.9;
  const lang = options.lang ?? 'en-US';

  const cancel = useCallback(() => {
    cancelSpeech();
    setError(null);
  }, []);

  const speak = useCallback(
    async (text: string): Promise<boolean> => {
      if (!supported) {
        setError('unsupported');
        return false;
      }

      if (!enabled) {
        setError('disabled');
        return false;
      }

      const result = await speakText(text, { rate, lang });

      if (!result.ok) {
        if (result.reason !== 'canceled') {
          setError(result.reason ?? 'error');
        }
        return false;
      }

      setError(null);
      return true;
    },
    [supported, enabled, rate, lang],
  );

  return {
    supported,
    enabled,
    speaking,
    error,
    errorMessage: error ? SPEECH_MESSAGES[error] : null,
    speak,
    cancel,
  };
}
