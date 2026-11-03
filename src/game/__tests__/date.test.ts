import { describe, expect, it } from 'vitest';
import {
  addLocalDays,
  diffLocalDays,
  formatDate,
  getWeekKey,
  isDateKeyToday,
  isDateKeyYesterday,
  parseDateKey,
  startOfLocalDay,
  startOfLocalWeek,
  toDateKey,
} from '../../utils/date';

describe('local date helpers', () => {
  it('formats a local date key', () => {
    expect(toDateKey(new Date(2026, 9, 26, 23, 59))).toBe(
      '2026-10-26',
    );
    expect(toDateKey(new Date(2026, 0, 1, 0, 0))).toBe(
      '2026-01-01',
    );
  });

  it('returns local midnight', () => {
    const start = startOfLocalDay(
      new Date(2026, 9, 26, 15, 30, 45, 123),
    );

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(9);
    expect(start.getDate()).toBe(26);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });

  it('adds days across month and year boundaries', () => {
    expect(
      toDateKey(
        addLocalDays(new Date(2026, 0, 31, 12), 1),
      ),
    ).toBe('2026-02-01');

    expect(
      toDateKey(
        addLocalDays(new Date(2026, 11, 31, 23, 30), 1),
      ),
    ).toBe('2027-01-01');

    expect(
      toDateKey(
        addLocalDays(new Date(2026, 9, 26, 8, 15), -1),
      ),
    ).toBe('2026-10-25');
  });

  it('diffs local calendar days ignoring time', () => {
    expect(
      diffLocalDays(
        new Date(2026, 10, 1, 0, 5),
        new Date(2026, 9, 31, 23, 55),
      ),
    ).toBe(1);

    expect(
      diffLocalDays(
        new Date(2026, 0, 2),
        new Date(2026, 0, 1),
      ),
    ).toBe(1);

    expect(
      diffLocalDays(
        new Date(2026, 9, 30),
        new Date(2026, 9, 26),
      ),
    ).toBe(4);
  });

  it('parses valid date keys and rejects impossible dates', () => {
    const parsed = parseDateKey('2026-10-26');

    expect(parsed).not.toBeNull();
    expect(toDateKey(parsed as Date)).toBe('2026-10-26');

    expect(parseDateKey('2026-02-30')).toBeNull();
    expect(parseDateKey('2026-1-1')).toBeNull();
    expect(parseDateKey('not-a-date')).toBeNull();
  });

  it('checks today and yesterday keys', () => {
    const now = new Date(2026, 9, 26, 18, 0);

    expect(isDateKeyToday('2026-10-26', now)).toBe(true);
    expect(isDateKeyToday('2026-10-25', now)).toBe(false);
    expect(isDateKeyYesterday('2026-10-25', now)).toBe(true);
    expect(isDateKeyYesterday('2026-10-24', now)).toBe(false);
    expect(isDateKeyYesterday('bad-key', now)).toBe(false);
  });

  it('starts a local week on Monday', () => {
    const monday = new Date(2026, 9, 26, 15, 30);
    const sunday = new Date(2026, 9, 25, 23, 59);

    expect(toDateKey(startOfLocalWeek(monday))).toBe(
      '2026-10-26',
    );
    expect(toDateKey(startOfLocalWeek(sunday))).toBe(
      '2026-10-19',
    );
  });

  it('builds week keys across month and year boundaries', () => {
    expect(getWeekKey(new Date(2026, 10, 1))).toBe(
      '2026-10-26',
    );
    expect(getWeekKey(new Date(2027, 0, 1))).toBe(
      '2026-12-28',
    );
  });

  it('formats invalid dates as a fallback', () => {
    expect(formatDate('not-an-iso')).toBe('—');
  });
});
