/**
 * 轻提示音服务。
 *
 * 使用 Web Audio API 合成短音，不依赖外部音频文件。
 * 浏览器不支持时静默降级；所有失败都不会阻塞答题。
 */

export type SoundEffect = 'correct' | 'wrong' | 'complete';

interface SoundTone {
  frequency: number;
  start: number;
  duration: number;
  type: OscillatorType;
}

const SOUND_TONES: Record<SoundEffect, readonly SoundTone[]> = {
  correct: [
    { frequency: 660, start: 0, duration: 0.08, type: 'sine' },
    { frequency: 880, start: 0.08, duration: 0.12, type: 'sine' },
  ],
  wrong: [
    { frequency: 220, start: 0, duration: 0.1, type: 'triangle' },
    { frequency: 180, start: 0.1, duration: 0.15, type: 'triangle' },
  ],
  complete: [
    { frequency: 523.25, start: 0, duration: 0.1, type: 'sine' },
    { frequency: 659.25, start: 0.1, duration: 0.1, type: 'sine' },
    { frequency: 783.99, start: 0.2, duration: 0.16, type: 'sine' },
  ],
};

const MASTER_VOLUME = 0.05;

interface WebkitAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let audioContext: AudioContext | null = null;

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;

  const webkitWindow = window as WebkitAudioWindow;

  return (
    window.AudioContext ??
    webkitWindow.webkitAudioContext ??
    null
  );
}

export function isSoundSupported(): boolean {
  return getAudioContextConstructor() !== null;
}

function getAudioContext(): AudioContext | null {
  if (audioContext && audioContext.state !== 'closed') {
    return audioContext;
  }

  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) return null;

  try {
    audioContext = new AudioContextConstructor();
    return audioContext;
  } catch (error) {
    console.warn('[sound] AudioContext 创建失败', error);
    return null;
  }
}

/**
 * 在首次用户手势内调用，解锁 iOS / Safari 的音频上下文。
 */
export function primeSound(): void {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === 'suspended') {
    void context.resume().catch(() => {
      // 静默降级；下一次用户手势会再次尝试
    });
  }
}

function scheduleTone(
  context: AudioContext,
  tone: SoundTone,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + tone.start;
  const endAt = startAt + tone.duration;

  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(
    tone.frequency,
    startAt,
  );

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(
    MASTER_VOLUME,
    startAt + 0.01,
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
}

/**
 * 播放一个提示音。
 * 返回是否成功安排播放；失败时不影响答题流程。
 */
export function playSound(effect: SoundEffect): boolean {
  const context = getAudioContext();
  if (!context) return false;

  if (context.state === 'suspended') {
    void context.resume().catch(() => {
      // 忽略：无用户手势时浏览器会拒绝恢复
    });
  }

  try {
    for (const tone of SOUND_TONES[effect]) {
      scheduleTone(context, tone);
    }
    return true;
  } catch (error) {
    console.warn('[sound] 播放失败', error);
    return false;
  }
}

export const SOUND_EFFECT_LABELS: Record<SoundEffect, string> = {
  correct: '答对音',
  wrong: '答错音',
  complete: '通关音',
};
