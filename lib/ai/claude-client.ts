import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const placeholderPattern = /HIER-DEINEN-KEY/;

export const hasApiKey =
  !!apiKey && apiKey.length > 0 && !placeholderPattern.test(apiKey);

export const client: Anthropic | null = hasApiKey ? new Anthropic() : null;

export const CLAUDE_MODEL = 'claude-sonnet-4-6';
