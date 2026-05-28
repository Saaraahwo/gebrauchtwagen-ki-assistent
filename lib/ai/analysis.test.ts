import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Car, Findings } from '@/lib/cars/types';

// Force demo mode by mocking the claude-client module
vi.mock('./claude-client', () => ({
  hasApiKey: false,
  client: null,
  CLAUDE_MODEL: 'claude-sonnet-4-6',
}));

const car: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 1, maintenanceRecords: 10, features: ['Navi'], accidents: [],
  enginePower: '135 kW', fuel: 'Benzin', color: 'Schwarz', transmission: 'Automatik',
};
const findings: Findings = { red: [], orange: [], green: [] };

describe('analyzeCarWithClaude (demo mode)', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns demo analysis when no API key set', async () => {
    const { analyzeCarWithClaude } = await import('./analysis');
    const result = await analyzeCarWithClaude(car, findings);
    expect(result.model).toBe('demo-mode');
    expect(typeof result.analysis).toBe('string');
    expect(result.analysis).toContain('Demo-Modus');
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
});
