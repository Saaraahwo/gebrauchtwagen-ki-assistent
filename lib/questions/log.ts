export interface QuestionEntry {
  articleNr: string;
  carName: string;
  question: string;
  answer: string;
  ts: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
  count: number;
}

const log: Record<number, QuestionEntry[]> = {};

export function articleNr(carId: number): string {
  return `BMW-GW-${String(carId).padStart(3, '0')}`;
}

export function logQuestion(
  carId: number,
  carName: string,
  question: string,
  answer: string,
): void {
  if (!log[carId]) log[carId] = [];
  log[carId].push({
    articleNr: articleNr(carId),
    carName,
    question,
    answer,
    ts: new Date().toISOString(),
  });
}

export function getQuestionsForCar(carId: number): {
  articleNr: string;
  logs: QuestionEntry[];
  faq: FaqEntry[];
} {
  const logs = log[carId] || [];
  const counts: Record<string, FaqEntry> = {};
  for (const entry of logs) {
    const key = entry.question.toLowerCase().trim();
    if (!counts[key]) {
      counts[key] = { question: entry.question, answer: entry.answer, count: 0 };
    }
    counts[key].count++;
  }
  const faq = Object.values(counts).sort((a, b) => b.count - a.count);
  return { articleNr: articleNr(carId), logs, faq };
}

// Test helper — do not call from production code.
export function _resetLog(): void {
  for (const k of Object.keys(log)) delete log[Number(k)];
}
