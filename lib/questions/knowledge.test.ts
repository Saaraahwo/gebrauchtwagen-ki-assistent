import { describe, it, expect, beforeEach } from 'vitest';
import { findKnowledgeAnswer, _resetKnowledge, _seedForTest } from './knowledge';

beforeEach(() => {
  _resetKnowledge();
});

describe('findKnowledgeAnswer', () => {
  it('returns null when no knowledge is seeded', () => {
    expect(findKnowledgeAnswer(99, 'Wie viel PS hat das Auto?')).toBeNull();
  });

  it('returns null when message matches no category', () => {
    _seedForTest(1, [
      { question: 'Wie viel PS?', answer: '140 PS', category: 'motor' },
    ]);
    expect(findKnowledgeAnswer(1, 'Was ist heute das Datum?')).toBeNull();
  });

  it('returns a motor answer when message contains "ps"', () => {
    _seedForTest(1, [
      { question: 'Wie viel PS hat das Auto?', answer: '140 PS (103 kW).', category: 'motor' },
    ]);
    const result = findKnowledgeAnswer(1, 'Wie viel PS hat der BMW?');
    expect(result).not.toBeNull();
    expect(result!.answer).toBe('140 PS (103 kW).');
    expect(result!.category).toBe('motor');
  });

  it('returns a consumption answer when message contains "verbrauch"', () => {
    _seedForTest(1, [
      { question: 'Wie viel verbraucht das Auto?', answer: 'Kombiniert 6,2 l/100km.', category: 'consumption' },
    ]);
    const result = findKnowledgeAnswer(1, 'Wie viel verbraucht der BMW 118i?');
    expect(result).not.toBeNull();
    expect(result!.category).toBe('consumption');
  });

  it('returns a dimensions answer when message contains "kofferraum"', () => {
    _seedForTest(1, [
      { question: 'Wie groß ist der Kofferraum?', answer: '360 Liter.', category: 'dimensions' },
    ]);
    const result = findKnowledgeAnswer(1, 'Wie groß ist der Kofferraum?');
    expect(result).not.toBeNull();
    expect(result!.category).toBe('dimensions');
  });

  it('returns null for a different car id even when knowledge exists for another', () => {
    _seedForTest(1, [
      { question: 'Wie viel PS?', answer: '140 PS', category: 'motor' },
    ]);
    expect(findKnowledgeAnswer(2, 'Wie viel PS hat das Auto?')).toBeNull();
  });

  it('motor category takes priority over general when both keywords present', () => {
    _seedForTest(1, [
      { question: 'Wie viel PS?', answer: '140 PS', category: 'motor' },
      { question: 'Wie alt?', answer: '2019', category: 'general' },
    ]);
    // "motor" keyword triggers motor category before general
    const result = findKnowledgeAnswer(1, 'Was ist die Motorleistung in PS?');
    expect(result!.category).toBe('motor');
  });
});
