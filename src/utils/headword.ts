/**
 * 例句目标词匹配与挖空工具。
 *
 * 规则：
 * - 大小写不敏感，句首大写的目标词也能匹配；
 * - 使用字母边界而不是简单 \b，避免 art 匹配到 start；
 * - 保留原句标点与空格，挖空后替换为固定占位符。
 */

export interface HeadwordMatch {
  index: number;
  length: number;
  text: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findHeadwordMatches(
  text: string,
  word: string,
): HeadwordMatch[] {
  const needle = word.trim();
  if (!needle) return [];

  const pattern = new RegExp(
    `(^|[^A-Za-z])(${escapeRegExp(needle)})(?![A-Za-z])`,
    'gi',
  );

  const matches: HeadwordMatch[] = [];

  for (const match of text.matchAll(pattern)) {
    const prefix = match[1] ?? '';
    const matched = match[2] ?? '';
    const index = (match.index ?? 0) + prefix.length;

    matches.push({
      index,
      length: matched.length,
      text: matched,
    });
  }

  return matches;
}

export function countHeadwordOccurrences(
  text: string,
  word: string,
): number {
  return findHeadwordMatches(text, word).length;
}

/**
 * 将例句中第一个目标词替换为空格占位符。
 * 阶段 1 用于确认规则；阶段 3 的例句填空题会复用该函数。
 */
export function blankHeadword(
  text: string,
  word: string,
  replacement = '____',
): string {
  const [firstMatch] = findHeadwordMatches(text, word);
  if (!firstMatch) return text;

  return (
    text.slice(0, firstMatch.index) +
    replacement +
    text.slice(firstMatch.index + firstMatch.length)
  );
}
