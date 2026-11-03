/**
 * 发音音色选择（纯函数）。
 *
 * 不直接访问 window / speechSynthesis，便于在 Node 环境单测。
 * 优先级：
 * 1. 本地 en-US；
 * 2. 任意 en-US（含在线音色）；
 * 3. 本地 en-*（如 en-GB）；
 * 4. 任意 en-*。
 * 同优先级优先浏览器默认音色，再按名称排序，保证结果稳定。
 */

export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

export function normalizeLanguageTag(lang: string): string {
  return lang.replace(/_/g, '-').trim().toLowerCase();
}

export function isEnglishVoice(voice: VoiceLike): boolean {
  return /^en(-|$)/.test(normalizeLanguageTag(voice.lang));
}

function getVoiceTier(voice: VoiceLike): number {
  const lang = normalizeLanguageTag(voice.lang);
  const isAmerican = lang === 'en-us' || lang.startsWith('en-us-');

  if (isAmerican && voice.localService) return 0;
  if (isAmerican) return 1;
  if (voice.localService) return 2;
  return 3;
}

/**
 * 从浏览器返回的音色列表中选择最适合朗读单词的音色。
 * 没有英语音色时返回 null，由调用方降级处理。
 */
export function pickEnglishVoice<T extends VoiceLike>(
  voices: readonly T[],
): T | null {
  const englishVoices = voices.filter(isEnglishVoice);

  if (englishVoices.length === 0) return null;

  const sorted = [...englishVoices].sort((left, right) => {
    const tierDiff = getVoiceTier(left) - getVoiceTier(right);
    if (tierDiff !== 0) return tierDiff;

    const defaultDiff =
      Number(Boolean(right.default)) - Number(Boolean(left.default));
    if (defaultDiff !== 0) return defaultDiff;

    return left.name.localeCompare(right.name);
  });

  return sorted[0] ?? null;
}
