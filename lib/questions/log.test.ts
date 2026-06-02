import { describe, it, expect, beforeEach } from 'vitest';
import { articleNr, logQuestion, getQuestionsForCar, getTopQuestions, _resetLog } from './log';

describe('articleNr', () => {
  it('formats car id to BMW-GW-XXX', () => {
    expect(articleNr(1)).toBe('BMW-GW-001');
    expect(articleNr(42)).toBe('BMW-GW-042');
    expect(articleNr(123)).toBe('BMW-GW-123');
  });
});

describe('logQuestion + getQuestionsForCar', () => {
  beforeEach(() => { _resetLog(); });

  it('stores and retrieves a question', () => {
    logQuestion(1, 'BMW 320i', 'Welcher Motor?', 'Benziner');
    const out = getQuestionsForCar(1);
    expect(out.articleNr).toBe('BMW-GW-001');
    expect(out.logs.length).toBe(1);
    expect(out.logs[0].question).toBe('Welcher Motor?');
  });

  it('builds FAQ sorted by count', () => {
    logQuestion(1, 'BMW', 'Wie viele km?', 'A1');
    logQuestion(1, 'BMW', 'Wie viele km?', 'A1');
    logQuestion(1, 'BMW', 'Hat es Unfälle?', 'A2');
    const { faq } = getQuestionsForCar(1);
    expect(faq[0].count).toBe(2);
    expect(faq[0].question).toBe('Wie viele km?');
    expect(faq[1].count).toBe(1);
  });

  it('returns empty for unknown car', () => {
    const out = getQuestionsForCar(999);
    expect(out.logs).toEqual([]);
    expect(out.faq).toEqual([]);
  });
});

describe('getTopQuestions', () => {
  beforeEach(() => { _resetLog(); });

  it('aggregates the most frequent questions across all cars, newest count first', () => {
    logQuestion(1, 'BMW 320i', 'Wie viele km?', 'A');
    logQuestion(2, 'BMW X5', 'Wie viele km?', 'A');
    logQuestion(3, 'BMW M5', 'Hat es Unfälle?', 'B');
    const top = getTopQuestions(5);
    expect(top[0].question).toBe('Wie viele km?');
    expect(top[0].count).toBe(2);
    expect(top.some(q => q.question === 'Hat es Unfälle?')).toBe(true);
  });

  it('respects the limit', () => {
    logQuestion(1, 'A', 'Frage eins', 'x');
    logQuestion(1, 'A', 'Frage zwei', 'y');
    logQuestion(1, 'A', 'Frage drei', 'z');
    expect(getTopQuestions(2)).toHaveLength(2);
  });
});
