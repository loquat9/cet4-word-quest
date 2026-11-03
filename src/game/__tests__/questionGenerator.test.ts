import { describe, expect, it } from 'vitest';
import type { Question, QuestionType } from '../../types';
import {
  ALL_QUESTION_TYPES,
  generateQuestions,
  QuestionGenerationError,
} from '../questionGenerator';
import { countQuestionTypes } from '../questionMix';
import {
  DUPLICATE_MEANING_WORDS,
  LARGE_TEST_WORDS,
  makeWord,
  TEST_WORDS,
} from './fixtures';

function expectValidChoiceQuestion(question: Question): void {
  expect(question.type).not.toBe('dictation');
  expect(question.options).toHaveLength(4);
  expect(new Set(question.options).size).toBe(4);
  expect(
    question.options.filter(
      (option) => option === question.correctAnswer,
    ),
  ).toHaveLength(1);
  expect(question.correctIndex).not.toBeNull();
  expect(question.options[question.correctIndex as number]).toBe(
    question.correctAnswer,
  );
  expect(question.chapter).toBe(1);
  expect(question.phonetic.length).toBeGreaterThan(0);
  expect(question.example?.length).toBeGreaterThan(0);
}

function expectValidDictationQuestion(question: Question): void {
  expect(question.type).toBe('dictation');
  expect(question.options).toEqual([]);
  expect(question.correctIndex).toBeNull();
  expect(question.correctAnswer).toBe(question.word);
  expect(question.prompt).toBe(question.meaning);
  expect(question.audioText).toBe(question.word);
  expect(question.answerLength).toBe(question.word.length);
  expect(question.hint?.startsWith(question.word[0])).toBe(true);
  expect(question.hint).not.toBe(question.word);
}

describe('generateQuestions', () => {
  it('generates the requested number of questions with unique target words', () => {
    const questions = generateQuestions({
      words: TEST_WORDS,
      count: 6,
      seed: 42,
    });

    expect(questions).toHaveLength(6);
    expect(
      new Set(questions.map((question) => question.wordId)).size,
    ).toBe(6);
    expect(new Set(questions.map((question) => question.id)).size).toBe(
      6,
    );
  });

  it('covers all five question types when count allows', () => {
    const questions = generateQuestions({
      words: TEST_WORDS,
      count: 10,
      seed: 42,
    });

    expect(new Set(questions.map((question) => question.type))).toEqual(
      new Set(ALL_QUESTION_TYPES),
    );

    for (const question of questions) {
      if (question.type === 'dictation') {
        expectValidDictationQuestion(question);
      } else {
        expectValidChoiceQuestion(question);
      }
    }
  });

  it('builds word-to-meaning questions with word prompt and meaning options', () => {
    const [question] = generateQuestions({
      words: TEST_WORDS,
      count: 1,
      types: ['word-to-meaning'],
      seed: 7,
    });

    expect(question.type).toBe('word-to-meaning');
    expect(question.prompt).toBe(question.word);
    expect(question.correctAnswer).toBe(question.meaning);
    expect(question.options).toContain(question.meaning);

    const allowedMeanings = new Set(
      TEST_WORDS.map((word) => word.meaning),
    );
    for (const option of question.options) {
      expect(allowedMeanings.has(option)).toBe(true);
    }
  });

  it('builds meaning-to-word questions with meaning prompt and word options', () => {
    const [question] = generateQuestions({
      words: TEST_WORDS,
      count: 1,
      types: ['meaning-to-word'],
      seed: 7,
    });

    expect(question.type).toBe('meaning-to-word');
    expect(question.prompt).toBe(question.meaning);
    expect(question.correctAnswer).toBe(question.word);
    expect(question.options).toContain(question.word);

    const allowedWords = new Set(
      TEST_WORDS.map((word) => word.word),
    );
    for (const option of question.options) {
      expect(allowedWords.has(option)).toBe(true);
    }
  });

  it('builds listen-to-word questions with word options and audio text', () => {
    const [question] = generateQuestions({
      words: TEST_WORDS,
      count: 1,
      types: ['listen-to-word'],
      seed: 7,
    });

    expectValidChoiceQuestion(question);
    expect(question.type).toBe('listen-to-word');
    expect(question.audioText).toBe(question.word);
    expect(question.prompt).toBe('听发音，选出你听到的单词');
    expect(question.correctAnswer).toBe(question.word);

    const allowedWords = new Set(
      TEST_WORDS.map((word) => word.word),
    );
    for (const option of question.options) {
      expect(allowedWords.has(option)).toBe(true);
    }
  });

  it('builds example-fill questions with the headword blanked out', () => {
    const [question] = generateQuestions({
      words: TEST_WORDS,
      count: 1,
      types: ['example-fill'],
      seed: 7,
    });

    expectValidChoiceQuestion(question);
    expect(question.type).toBe('example-fill');
    expect(question.prompt).toContain('____');
    expect(question.correctAnswer).toBe(question.word);
    expect(question.options).toContain(question.word);
    expect(question.exampleTranslation?.length).toBeGreaterThan(0);
  });

  it('builds dictation questions without options and with a first-letter hint', () => {
    const questions = generateQuestions({
      words: TEST_WORDS,
      count: 3,
      types: ['dictation'],
      seed: 7,
    });

    expect(questions).toHaveLength(3);

    for (const question of questions) {
      expectValidDictationQuestion(question);
      const [first, ...rest] = question.word;
      expect(question.hint).toBe(
        [first, ...rest.map(() => '_')].join(' '),
      );
    }
  });

  it('follows chapter weights instead of a fixed rotation', () => {
    const questions = generateQuestions({
      words: LARGE_TEST_WORDS,
      count: 12,
      types: ['example-fill', 'meaning-to-word'],
      weights: { 'example-fill': 0.75, 'meaning-to-word': 0.25 },
      seed: 2026,
    });

    const counts = countQuestionTypes(
      questions.map((question) => question.type),
    );

    expect(questions).toHaveLength(12);
    expect(counts['example-fill']).toBeGreaterThanOrEqual(8);
    expect(counts['meaning-to-word']).toBeGreaterThanOrEqual(3);
    expect(
      (counts['example-fill'] ?? 0) >
        (counts['meaning-to-word'] ?? 0),
    ).toBe(true);
  });

  it('keeps every distractor from the same chapter', () => {
    const questions = generateQuestions({
      words: LARGE_TEST_WORDS,
      count: 12,
      seed: 1234,
    });

    for (const question of questions) {
      if (question.type === 'dictation') continue;

      const allowedValues = new Set<string>();

      if (
        question.type === 'word-to-meaning'
      ) {
        LARGE_TEST_WORDS.forEach((word) =>
          allowedValues.add(word.meaning),
        );
      } else {
        LARGE_TEST_WORDS.forEach((word) =>
          allowedValues.add(word.word),
        );
      }

      for (const option of question.options) {
        expect(allowedValues.has(option)).toBe(true);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    const first = generateQuestions({
      words: LARGE_TEST_WORDS,
      count: 12,
      seed: 2026,
    });
    const second = generateQuestions({
      words: LARGE_TEST_WORDS,
      count: 12,
      seed: 2026,
    });

    expect(second).toEqual(first);
  });

  it('never emits duplicate options when meanings collide', () => {
    const questions = generateQuestions({
      words: DUPLICATE_MEANING_WORDS,
      count: 5,
      types: ['word-to-meaning'],
      seed: 11,
    });

    for (const question of questions) {
      expectValidChoiceQuestion(question);
    }
  });

  it('limits the longest run of the same question type', () => {
    const questions = generateQuestions({
      words: LARGE_TEST_WORDS,
      count: 12,
      types: ['dictation', 'listen-to-word'],
      weights: { dictation: 0.7, 'listen-to-word': 0.3 },
      seed: 99,
    });

    const types = questions.map((question) => question.type);
    let run = 1;
    let maxRun = 1;

    for (let index = 1; index < types.length; index += 1) {
      run = types[index] === types[index - 1] ? run + 1 : 1;
      maxRun = Math.max(maxRun, run);
    }

    expect(maxRun).toBeLessThanOrEqual(3);
  });

  it('throws when the word pool is too small', () => {
    expect(() =>
      generateQuestions({
        words: TEST_WORDS.slice(0, 3),
        count: 1,
      }),
    ).toThrow(QuestionGenerationError);
  });

  it('throws when count exceeds the pool size', () => {
    expect(() =>
      generateQuestions({
        words: TEST_WORDS,
        count: TEST_WORDS.length + 1,
      }),
    ).toThrow(QuestionGenerationError);
  });

  it('throws when words come from multiple chapters', () => {
    const mixed = [
      ...TEST_WORDS,
      makeWord({
        id: 'chapter-2-word',
        word: 'other',
        meaning: 'n. 其他',
        chapter: 2,
        difficulty: 2,
      }),
    ];

    expect(() =>
      generateQuestions({
        words: mixed,
        count: 4,
      }),
    ).toThrow(QuestionGenerationError);
  });

  it('throws when no question types are supplied', () => {
    expect(() =>
      generateQuestions({
        words: TEST_WORDS,
        count: 4,
        types: [],
      }),
    ).toThrow(QuestionGenerationError);
  });

  it('throws for an unsupported question type', () => {
    expect(() =>
      generateQuestions({
        words: TEST_WORDS,
        count: 4,
        types: ['unknown-type' as QuestionType],
      }),
    ).toThrow(QuestionGenerationError);
  });

  it('throws when an example does not contain its headword', () => {
    const broken = TEST_WORDS.slice(0, 5).map((word) =>
      makeWord({
        ...word,
        example: 'He gave up the plan.',
      }),
    );

    expect(() =>
      generateQuestions({
        words: broken,
        count: 1,
        types: ['example-fill'],
        seed: 1,
      }),
    ).toThrow(QuestionGenerationError);
  });

  it('uses explicitly provided target words exactly', () => {
    const targets = [
      TEST_WORDS[0],
      TEST_WORDS[2],
      TEST_WORDS[4],
    ];

    const questions = generateQuestions({
      words: TEST_WORDS,
      count: 3,
      types: ['word-to-meaning'],
      targets,
      seed: 5,
    });

    expect(
      questions.map((question) => question.wordId).sort(),
    ).toEqual(targets.map((word) => word.id).sort());
  });

  it('throws when target count does not match count', () => {
    expect(() =>
      generateQuestions({
        words: TEST_WORDS,
        count: 2,
        targets: TEST_WORDS.slice(0, 3),
      }),
    ).toThrow(QuestionGenerationError);
  });

  it('throws for duplicate target words', () => {
    expect(() =>
      generateQuestions({
        words: TEST_WORDS,
        count: 3,
        targets: [
          TEST_WORDS[0],
          TEST_WORDS[0],
          TEST_WORDS[1],
        ],
      }),
    ).toThrow(QuestionGenerationError);
  });

  it('throws when targets come from another chapter', () => {
    const otherChapter = makeWord({
      id: 'target-chapter-2',
      word: 'other',
      meaning: 'n. 其他',
      chapter: 2,
      difficulty: 2,
    });

    expect(() =>
      generateQuestions({
        words: TEST_WORDS,
        count: 3,
        targets: [
          TEST_WORDS[0],
          otherChapter,
          TEST_WORDS[1],
        ],
      }),
    ).toThrow(QuestionGenerationError);
  });

  it('throws when a target is not in the word pool', () => {
    const ghost = makeWord({
      id: 'ghost-word',
      word: 'ghost',
      meaning: 'n. 幽灵',
    });

    expect(() =>
      generateQuestions({
        words: TEST_WORDS,
        count: 3,
        targets: [
          TEST_WORDS[0],
          ghost,
          TEST_WORDS[1],
        ],
      }),
    ).toThrow(QuestionGenerationError);
  });
});
