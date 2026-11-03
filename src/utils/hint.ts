/**
 * 听写题提示工具。
 *
 * 首字母提示只暴露单词首字符，其余字符用下划线占位，
 * 例如 abandon -> "a _ _ _ _ _ _"。提示本身不包含完整答案。
 */

/** 听写答案的字符数（按 Unicode 字符计，避免代理对截断） */
export function getAnswerLength(word: string): number {
  return Array.from(word.trim()).length;
}

/**
 * 构造首字母提示。
 * 空字符串返回空串；单词中间的连字符、撇号也各自占一个槽位，
 * 与实际输入长度保持一致。
 */
export function buildLetterHint(word: string): string {
  const characters = Array.from(word.trim());

  if (characters.length === 0) return '';

  return [characters[0], ...characters.slice(1).map(() => '_')].join(
    ' ',
  );
}
