import type { Word } from '../../types';

export function makeWord(
  overrides: Pick<Word, 'id' | 'word' | 'meaning'> & Partial<Word>,
): Word {
  return {
    phonetic: '/test/',
    pos: 'v.',
    example: `This is an example with ${overrides.word}.`,
    exampleTranslation: `这是 ${overrides.word} 的例句。`,
    chapter: 1,
    difficulty: 1,
    audioUrl: '',
    ...overrides,
  };
}

/**
 * 10 个同章节测试词，含义与拼写均唯一。
 * 故意包含 v. / n. / adj. 三种词性，便于检查同词性干扰项。
 */
export const TEST_WORDS: readonly Word[] = [
  makeWord({
    id: 'test-1',
    word: 'abandon',
    phonetic: '/əˈbændən/',
    meaning: 'v. 放弃',
    pos: 'v.',
  }),
  makeWord({
    id: 'test-2',
    word: 'ability',
    phonetic: '/əˈbɪləti/',
    meaning: 'n. 能力',
    pos: 'n.',
  }),
  makeWord({
    id: 'test-3',
    word: 'absorb',
    phonetic: '/əbˈzɔːrb/',
    meaning: 'v. 吸收',
    pos: 'v.',
  }),
  makeWord({
    id: 'test-4',
    word: 'accept',
    phonetic: '/əkˈsept/',
    meaning: 'v. 接受',
    pos: 'v.',
  }),
  makeWord({
    id: 'test-5',
    word: 'access',
    phonetic: '/ˈækses/',
    meaning: 'n. 通道',
    pos: 'n.',
  }),
  makeWord({
    id: 'test-6',
    word: 'active',
    phonetic: '/ˈæktɪv/',
    meaning: 'adj. 活跃的',
    pos: 'adj.',
  }),
  makeWord({
    id: 'test-7',
    word: 'actual',
    phonetic: '/ˈæktʃuəl/',
    meaning: 'adj. 实际的',
    pos: 'adj.',
  }),
  makeWord({
    id: 'test-8',
    word: 'adapt',
    phonetic: '/əˈdæpt/',
    meaning: 'v. 适应',
    pos: 'v.',
  }),
  makeWord({
    id: 'test-9',
    word: 'avoid',
    phonetic: '/əˈvɔɪd/',
    meaning: 'v. 避免',
    pos: 'v.',
  }),
  makeWord({
    id: 'test-10',
    word: 'aware',
    phonetic: '/əˈwer/',
    meaning: 'adj. 意识到的',
    pos: 'adj.',
  }),
];

/**
 * 用于验证选项去重：begin / start 的 meaning 完全相同。
 */
export const DUPLICATE_MEANING_WORDS: readonly Word[] = [
  makeWord({
    id: 'dup-1',
    word: 'begin',
    meaning: 'v. 开始',
    pos: 'v.',
  }),
  makeWord({
    id: 'dup-2',
    word: 'start',
    meaning: 'v. 开始',
    pos: 'v.',
  }),
  makeWord({
    id: 'dup-3',
    word: 'carry',
    meaning: 'v. 携带',
    pos: 'v.',
  }),
  makeWord({
    id: 'dup-4',
    word: 'close',
    meaning: 'v. 关闭',
    pos: 'v.',
  }),
  makeWord({
    id: 'dup-5',
    word: 'create',
    meaning: 'v. 创造',
    pos: 'v.',
  }),
];

const EXTRA_LEXICON: ReadonlyArray<{
  word: string;
  meaning: string;
  pos: string;
}> = [
  { word: 'balance', meaning: 'n. 平衡', pos: 'n.' },
  { word: 'benefit', meaning: 'n. 益处', pos: 'n.' },
  { word: 'capture', meaning: 'v. 捕获', pos: 'v.' },
  { word: 'decline', meaning: 'v. 下降', pos: 'v.' },
  { word: 'effort', meaning: 'n. 努力', pos: 'n.' },
  { word: 'feature', meaning: 'n. 特征', pos: 'n.' },
  { word: 'gather', meaning: 'v. 聚集', pos: 'v.' },
  { word: 'handle', meaning: 'v. 处理', pos: 'v.' },
  { word: 'improve', meaning: 'v. 改善', pos: 'v.' },
  { word: 'justify', meaning: 'v. 证明合理', pos: 'v.' },
];

/**
 * 20 个同章节测试词，用于需要 12 题以上的权重与序列测试。
 * 每个词的例句都恰好包含目标词一次，满足例句填空前置条件。
 */
export const LARGE_TEST_WORDS: readonly Word[] = [
  ...TEST_WORDS,
  ...EXTRA_LEXICON.map(({ word, meaning, pos }, index) =>
    makeWord({
      id: `extra-${index + 1}`,
      word,
      meaning,
      pos,
    }),
  ),
];
