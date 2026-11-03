import { describe, expect, it } from 'vitest';
import {
  isEnglishVoice,
  normalizeLanguageTag,
  pickEnglishVoice,
  type VoiceLike,
} from '../voice';

const voice = (
  name: string,
  lang: string,
  extra: Partial<VoiceLike> = {},
): VoiceLike => ({
  name,
  lang,
  localService: false,
  default: false,
  ...extra,
});

describe('pickEnglishVoice', () => {
  it('prefers a local en-US voice', () => {
    const voices = [
      voice('Google US English', 'en-US', { localService: false }),
      voice('Samantha', 'en-US', { localService: true }),
      voice('Daniel', 'en-GB', { localService: true }),
    ];

    expect(pickEnglishVoice(voices)?.name).toBe('Samantha');
  });

  it('prefers en-US over a local en-GB voice when both are local', () => {
    const voices = [
      voice('Daniel', 'en-GB', { localService: true }),
      voice('Alex', 'en-US', { localService: true }),
    ];

    expect(pickEnglishVoice(voices)?.name).toBe('Alex');
  });

  it('falls back to a local non-US English voice', () => {
    const voices = [
      voice('Karen', 'en-AU', { localService: false }),
      voice('Daniel', 'en-GB', { localService: true }),
    ];

    expect(pickEnglishVoice(voices)?.name).toBe('Daniel');
  });

  it('falls back to any English voice when no local voice exists', () => {
    const voices = [
      voice('Google UK English', 'en-GB', { localService: false }),
      voice('Google 日本語', 'ja-JP', { localService: true }),
    ];

    expect(pickEnglishVoice(voices)?.name).toBe(
      'Google UK English',
    );
  });

  it('returns null when there is no English voice', () => {
    expect(pickEnglishVoice([])).toBeNull();
    expect(
      pickEnglishVoice([
        voice('Ting-Ting', 'zh-CN', { localService: true }),
        voice('Thomas', 'fr-FR', { localService: true }),
      ]),
    ).toBeNull();
  });

  it('normalizes underscored language tags', () => {
    expect(normalizeLanguageTag('en_US')).toBe('en-us');
    expect(
      isEnglishVoice(voice('Legacy', 'en_US', { localService: true })),
    ).toBe(true);
    expect(
      pickEnglishVoice([
        voice('Legacy', 'en_US', { localService: true }),
      ])?.name,
    ).toBe('Legacy');
  });

  it('breaks ties by default flag, then by name', () => {
    const voices = [
      voice('Zulu', 'en-US', { localService: true }),
      voice('Alpha', 'en-US', { localService: true, default: true }),
      voice('Bravo', 'en-US', { localService: true }),
    ];

    expect(pickEnglishVoice(voices)?.name).toBe('Alpha');
  });
});
