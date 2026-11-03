import { useEffect, useRef } from 'react';
import { playSound } from '../services/sound';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';

/**
 * 答题音效：
 * - 答对 / 答错在反馈出现时各播放一次；
 * - 通关在 finished 时播放一次；
 * - 设置关闭音效时全部跳过。
 */
export function useGameSounds(): void {
  const soundEnabled = useSettingsStore(
    (state) => state.settings.soundEnabled,
  );
  const status = useGameStore((state) => state.status);
  const feedback = useGameStore((state) => state.feedback);

  const lastFeedbackIdRef = useRef<string | null>(null);
  const completePlayedRef = useRef(false);

  useEffect(() => {
    if (status === 'idle' || status === 'loading') {
      lastFeedbackIdRef.current = null;
      completePlayedRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    if (!soundEnabled || !feedback) return;
    if (lastFeedbackIdRef.current === feedback.question.id) {
      return;
    }

    lastFeedbackIdRef.current = feedback.question.id;
    playSound(feedback.isCorrect ? 'correct' : 'wrong');
  }, [feedback, soundEnabled]);

  useEffect(() => {
    if (status !== 'finished') return;
    if (!soundEnabled || completePlayedRef.current) return;

    completePlayedRef.current = true;
    playSound('complete');
  }, [status, soundEnabled]);
}
