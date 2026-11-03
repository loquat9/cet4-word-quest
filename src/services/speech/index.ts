import { pickEnglishVoice } from './voice';

/**
 * Web Speech API 封装。
 *
 * 设计约束：
 * - 不抛异常；失败统一返回结果对象；
 * - 每次 speak 前先 cancel 上一个发音，避免声音重叠；
 * - 浏览器不支持时静默降级，由 UI 展示提示，不阻塞答题；
 * - Chrome / iOS 的常见异常（paused、voices 未就绪、长时间无回调）做兜底。
 */

export type SpeechFailureReason =
  | 'unsupported'
  | 'disabled'
  | 'empty'
  | 'canceled'
  | 'error';

export interface SpeakOptions {
  rate?: number;
  lang?: string;
  pitch?: number;
  volume?: number;
}

export interface SpeakResult {
  ok: boolean;
  reason?: SpeechFailureReason;
}

export const SPEECH_MESSAGES: Record<SpeechFailureReason, string> = {
  unsupported: '当前浏览器不支持发音',
  disabled: '发音已在设置中关闭',
  empty: '没有可朗读的内容',
  canceled: '',
  error: '发音播放失败，请重试',
};

const DEFAULT_RATE = 0.9;
const DEFAULT_LANG = 'en-US';
const MIN_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 15000;

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeResolve: ((result: SpeakResult) => void) | null = null;
let timeoutId: number | null = null;
let speaking = false;
let primed = false;

const speakingListeners = new Set<() => void>();

function getSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.speechSynthesis === 'undefined') return null;
  if (typeof window.SpeechSynthesisUtterance !== 'function') return null;
  return window.speechSynthesis;
}

function setSpeaking(next: boolean): void {
  if (speaking === next) return;
  speaking = next;
  for (const listener of speakingListeners) listener();
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function settle(result: SpeakResult): void {
  if (timeoutId !== null) {
    window.clearTimeout(timeoutId);
    timeoutId = null;
  }

  const resolve = activeResolve;
  activeResolve = null;
  activeUtterance = null;
  setSpeaking(false);
  resolve?.(result);
}

/** 当前浏览器是否具备语音合成能力 */
export function isSpeechSupported(): boolean {
  return getSynthesis() !== null;
}

/** 供 useSyncExternalStore 订阅全局播放状态 */
export function subscribeSpeech(listener: () => void): () => void {
  speakingListeners.add(listener);
  return () => {
    speakingListeners.delete(listener);
  };
}

export function isSpeaking(): boolean {
  return speaking;
}

/** 当前可用的英语音色；用于设置页展示与调试 */
export function getEnglishVoice(): SpeechSynthesisVoice | null {
  const synthesis = getSynthesis();
  if (!synthesis) return null;
  return pickEnglishVoice(synthesis.getVoices());
}

/** 监听系统音色列表变化（部分浏览器异步加载音色） */
export function onVoicesChanged(listener: () => void): () => void {
  const synthesis = getSynthesis();
  if (!synthesis) return () => {};

  const handler = () => listener();
  synthesis.addEventListener('voiceschanged', handler);

  return () => {
    synthesis.removeEventListener('voiceschanged', handler);
  };
}

/**
 * iOS / Safari 需要在首次用户手势内触发一次朗读来“解锁”语音合成。
 * 只执行一次；静音朗读一个空格，不进入全局播放状态。
 */
export function primeSpeech(): void {
  if (primed || !isSpeechSupported()) return;
  primed = true;

  const synthesis = getSynthesis();
  if (!synthesis) return;

  try {
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.lang = DEFAULT_LANG;
    utterance.rate = 2;
    utterance.volume = 0;
    synthesis.speak(utterance);
  } catch {
    // 解锁失败不影响后续真实播放
  }
}

/** 取消当前发音；调用方无需关心是否有正在播放的内容 */
export function cancelSpeech(): void {
  const synthesis = getSynthesis();
  if (!synthesis) return;

  if (activeUtterance) {
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
  }

  try {
    synthesis.cancel();
  } catch {
    // 某些浏览器在无语音时 cancel 会抛错，忽略
  }

  if (activeResolve) {
    settle({ ok: false, reason: 'canceled' });
  } else {
    setSpeaking(false);
  }
}

/**
 * 朗读文本。
 * 任意时刻只允许一个发音：进入时先取消上一个。
 */
export function speak(
  text: string,
  options: SpeakOptions = {},
): Promise<SpeakResult> {
  const synthesis = getSynthesis();

  if (!synthesis) {
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }

  const content = text.trim();

  if (!content) {
    return Promise.resolve({ ok: false, reason: 'empty' });
  }

  // 关键：新发音前取消旧发音，避免多个单词叠在一起
  cancelSpeech();

  return new Promise<SpeakResult>((resolve) => {
    let utterance: SpeechSynthesisUtterance;

    try {
      utterance = new SpeechSynthesisUtterance(content);
    } catch {
      resolve({ ok: false, reason: 'error' });
      return;
    }

    utterance.lang = options.lang ?? DEFAULT_LANG;
    utterance.rate = clamp(options.rate ?? DEFAULT_RATE, 0.5, 2);
    utterance.pitch = clamp(options.pitch ?? 1, 0, 2);
    utterance.volume = clamp(options.volume ?? 1, 0, 1);

    const voice = pickEnglishVoice(synthesis.getVoices());
    if (voice) {
      utterance.voice = voice;
    }

    activeUtterance = utterance;
    activeResolve = resolve;
    setSpeaking(true);

    const timeoutMs = Math.min(
      MAX_TIMEOUT_MS,
      Math.max(MIN_TIMEOUT_MS, 4000 + content.length * 120),
    );

    timeoutId = window.setTimeout(() => {
      if (activeUtterance !== utterance) return;

      try {
        synthesis.cancel();
      } catch {
        // 忽略
      }

      settle({ ok: false, reason: 'error' });
    }, timeoutMs);

    utterance.onend = () => {
      if (activeUtterance !== utterance) return;
      settle({ ok: true });
    };

    utterance.onerror = (event) => {
      if (activeUtterance !== utterance) return;

      const reason: SpeechFailureReason =
        event.error === 'canceled' || event.error === 'interrupted'
          ? 'canceled'
          : 'error';

      settle({ ok: false, reason });
    };

    try {
      if (synthesis.paused) {
        synthesis.resume();
      }
      synthesis.speak(utterance);
    } catch {
      settle({ ok: false, reason: 'error' });
    }
  });
}
