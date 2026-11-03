import type { Question } from '../types';

export type AnswerInput = string | number;

/**
 * 听写答案归一化：忽略大小写与首尾空格。
 * 导出以便单测和结果页展示复用。
 */
export function normalizeSpelling(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * 集中判题入口。
 *
 * - 选择题：支持选项索引或选项文本；
 * - 听写题：忽略大小写与首尾空格，空输入判错；
 * - 不修改题目对象。
 */
export function judgeAnswer(
  question: Question,
  answer: AnswerInput,
): boolean {
  if (question.type === 'dictation') {
    if (typeof answer !== 'string') return false;

    const normalized = normalizeSpelling(answer);
    if (normalized.length === 0) return false;

    return normalized === normalizeSpelling(question.correctAnswer);
  }

  if (typeof answer === 'number') {
    return (
      question.correctIndex !== null &&
      Number.isInteger(answer) &&
      answer === question.correctIndex
    );
  }

  const selected = answer.trim();
  if (selected.length === 0) return false;

  return selected === question.correctAnswer.trim();
}
