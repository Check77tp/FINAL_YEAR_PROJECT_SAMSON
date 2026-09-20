import { describe, it, expect } from 'vitest';
import { rankTechnicians } from './users.service.js';

const tech = (id, name, availability) => ({ user_id: id, name, id_number: id, availability_status: availability });

describe('rankTechnicians (assignment recommendation)', () => {
  it('puts available technicians before ones on a job, and off-duty last', () => {
    const ranked = rankTechnicians(
      [tech('a', 'Ann', 'off_duty'), tech('b', 'Ben', 'on_job'), tech('c', 'Cy', 'available')],
      new Map()
    );
    expect(ranked.map((t) => t.id)).toEqual(['c', 'b', 'a']);
  });

  it('among equally available technicians, prefers the least busy', () => {
    const ranked = rankTechnicians(
      [tech('a', 'Ann', 'available'), tech('b', 'Ben', 'available')],
      new Map([['a', 3], ['b', 1]])
    );
    expect(ranked[0].id).toBe('b');
    expect(ranked[0].recommended).toBe(true);
    expect(ranked[0].activeTasks).toBe(1);
    expect(ranked[1].recommended).toBe(false);
  });

  it('a free technician beats a less-busy one who is on a job', () => {
    const ranked = rankTechnicians(
      [tech('a', 'Ann', 'on_job'), tech('b', 'Ben', 'available')],
      new Map([['a', 0], ['b', 4]])
    );
    expect(ranked[0].id).toBe('b');
  });

  it('never recommends anyone when every technician is off duty', () => {
    const ranked = rankTechnicians([tech('a', 'Ann', 'off_duty')], new Map());
    expect(ranked.some((t) => t.recommended)).toBe(false);
  });

  it('breaks ties alphabetically so the order is stable', () => {
    const ranked = rankTechnicians([tech('b', 'Ben', 'available'), tech('a', 'Ann', 'available')], new Map());
    expect(ranked.map((t) => t.name)).toEqual(['Ann', 'Ben']);
  });
});
