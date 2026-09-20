// Unit tests for triage: the keyword-rules engine, the hazard safety floor,
// and the rate limit. The AI path is disabled here (no API key in tests), so
// these run offline and deterministically.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as categoriesRepository from '../repositories/categories.repository.js';
import { suggestTriage, suggestWithRules, priorityFloor, assertWithinRateLimit } from './triage.service.js';

vi.mock('../repositories/categories.repository.js');
vi.mock('../config/anthropic.js', () => ({ aiEnabled: false, aiModel: 'test', anthropic: null }));

const categories = [
  { id: 1, name: 'Plumbing' },
  { id: 2, name: 'Electrical' },
  { id: 3, name: 'Furniture' },
];

describe('suggestWithRules', () => {
  it('matches the category with the most keyword hits', () => {
    const s = suggestWithRules('The tap in my room keeps dripping and the sink is blocked', categories);
    expect(s.categoryId).toBe(1);
    expect(s.priority).toBe('medium');
    expect(s.source).toBe('rules');
  });

  it('returns no category when nothing matches', () => {
    expect(suggestWithRules('Something is wrong with my room', categories).categoryId).toBeNull();
  });

  it('marks cosmetic problems low', () => {
    expect(suggestWithRules('The desk has a small scratch', categories).priority).toBe('low');
  });
});

describe('priorityFloor (safety)', () => {
  it('forces hazards to critical', () => {
    expect(priorityFloor('The socket is sparking and smells of smoke')).toBe('critical');
    expect(priorityFloor('Bathroom is flooding')).toBe('critical');
  });

  it('forces loss of service to at least high', () => {
    expect(priorityFloor('We have no water since morning')).toBe('high');
  });

  it('adds no floor to ordinary faults', () => {
    expect(priorityFloor('The chair wobbles')).toBeNull();
  });
});

describe('suggestTriage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoriesRepository.findAllCategories.mockResolvedValue(
      categories.map((c) => ({ category_id: c.id, name: c.name, description: '' }))
    );
  });

  it('rejects a too-short description', async () => {
    await expect(suggestTriage({ description: 'tap' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('applies the safety floor over a low-looking description', async () => {
    const s = suggestTriage({ description: 'small scratch but the wiring is sparking' });
    await expect(s).resolves.toMatchObject({ categoryId: 2, priority: 'critical' });
  });
});

describe('assertWithinRateLimit', () => {
  it('allows 10 calls a minute then rejects with 429', () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) assertWithinRateLimit('u-rate', now + i);
    expect(() => assertWithinRateLimit('u-rate', now + 20)).toThrow(/Too many/);
    // window passes -> allowed again
    expect(() => assertWithinRateLimit('u-rate', now + 61_000)).not.toThrow();
  });
});
