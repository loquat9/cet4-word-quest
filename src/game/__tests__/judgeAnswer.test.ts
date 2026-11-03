import { describe, expect, it } from 'vitest';
import type { Question } from '../../types';
import { judgeAnswer, normalizeSpelling } from '../judgeAnswer';

const choiceQuestion: Question = {
  id: 'q-choice',
  type: 'word-to-meaning',
  wordId: 'test-1',
  chapter: 1,
  difficulty: 1,
  word: 'abandon',
  phonetic: '/əˈbændən/',
  meaning: 'v. 放弃',
  audioText: 'abandon',
  prompt: 'abandon',
  options: ['v. 放弃', 'n. 能力', 'v. 吸收', 'adj. 活跃的'],
  correctAnswer: 'v. 放弃',
  correctIndex: 0,
  example: 'Abandon the old plan.',
  exampleTranslation: '放弃旧计划。',
};

const dictationQuestion: Question = {
  id: 'q-dictation',
  type: 'dictation',
  wordId: 'test-1',
  chapter: 1,
  difficulty: 1,
  word: 'abandon',
  phonetic: '/əˈbændən/',
  meaning: 'v. 放弃',
  audioText: 'abandon',
  prompt: 'v. 放弃',
  options: [],
  correctAnswer: 'abandon',
  correctIndex: null,
  example: 'Abandon the old plan.',
  exampleTranslation: '放弃旧计划。',
  hint: 'a______',
};

const listenQuestion: Question = {
  ...choiceQuestion,
  id: 'q-listen',
  type: 'listen-to-word',
  prompt: '听发音，选出你听到的单词',
  options: ['abandon', 'ability', 'absorb', 'accept'],
  correctAnswer: 'abandon',
  correctIndex: 0,
};

const exampleFillQuestion: Question = {
  ...choiceQuestion,
  id: 'q-example',
  type: 'example-fill',
  prompt: '____ the old plan.',
  options: ['abandon', 'ability', 'absorb', 'accept'],
  correctAnswer: 'abandon',
  correctIndex: 3,
};

describe('judgeAnswer', () => {
  it('accepts a correct choice by option index', () => {
    expect(judgeAnswer(choiceQuestion, 0)).toBe(true);
  });

  it('rejects a wrong choice by option index', () => {
    expect(judgeAnswer(choiceQuestion, 1)).toBe(false);
    expect(judgeAnswer(choiceQuestion, 99)).toBe(false);
  });

  it('accepts a correct choice by option text and trims whitespace', () => {
    expect(judgeAnswer(choiceQuestion, 'v. 放弃')).toBe(true);
    expect(judgeAnswer(choiceQuestion, '  v. 放弃  ')).toBe(true);
  });

  it('rejects a wrong choice by option text', () => {
    expect(judgeAnswer(choiceQuestion, 'n. 能力')).toBe(false);
    expect(judgeAnswer(choiceQuestion, '')).toBe(false);
  });

  it('ignores case and surrounding spaces for dictation', () => {
    expect(judgeAnswer(dictationQuestion, 'abandon')).toBe(true);
    expect(judgeAnswer(dictationQuestion, 'Abandon')).toBe(true);
    expect(judgeAnswer(dictationQuestion, ' ABANDON ')).toBe(true);
  });

  it('rejects empty or wrong dictation answers', () => {
    expect(judgeAnswer(dictationQuestion, '')).toBe(false);
    expect(judgeAnswer(dictationQuestion, '   ')).toBe(false);
    expect(judgeAnswer(dictationQuestion, 'abandoned')).toBe(false);
    expect(judgeAnswer(dictationQuestion, 0)).toBe(false);
  });

  it('normalizes spelling for case and surrounding whitespace only', () => {
    expect(normalizeSpelling(' Abandon ')).toBe('abandon');
    expect(normalizeSpelling('\tABANDON\n')).toBe('abandon');
    expect(normalizeSpelling('abandon')).toBe('abandon');
  });

  it('judges listen-to-word questions like other choices', () => {
    expect(judgeAnswer(listenQuestion, 0)).toBe(true);
    expect(judgeAnswer(listenQuestion, 'abandon')).toBe(true);
    expect(judgeAnswer(listenQuestion, 1)).toBe(false);
    expect(judgeAnswer(listenQuestion, 'ability')).toBe(false);
  });

  it('judges example-fill questions by option index or text', () => {
    expect(judgeAnswer(exampleFillQuestion, 3)).toBe(true);
    expect(judgeAnswer(exampleFillQuestion, 'abandon')).toBe(true);
    expect(judgeAnswer(exampleFillQuestion, 0)).toBe(false);
    expect(judgeAnswer(exampleFillQuestion, 'Ability')).toBe(false);
  });
});
