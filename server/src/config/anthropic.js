// Anthropic (Claude) client, used only for the AI triage suggestion. If
// ANTHROPIC_API_KEY is not set, AI is simply disabled and triage falls back
// to keyword rules — the rest of the app never depends on it.
import './env.js';
import Anthropic from '@anthropic-ai/sdk';

const { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } = process.env;

export const aiEnabled = Boolean(ANTHROPIC_API_KEY);
export const aiModel = ANTHROPIC_MODEL || 'claude-opus-5';

// Short timeout and a single retry: this is an inline "nice to have" while a
// student types, so it must fail fast rather than hang the form.
export const anthropic = aiEnabled
  ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, timeout: 10_000, maxRetries: 1 })
  : null;
