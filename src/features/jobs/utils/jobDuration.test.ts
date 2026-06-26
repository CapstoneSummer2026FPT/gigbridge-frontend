import { describe, expect, it } from 'vitest';
import { formatJobDuration, isValidJobDurationValue, parseJobDuration } from './jobDuration';

describe('jobDuration utilities', () => {
  it('parses supported duration units', () => {
    expect(parseJobDuration('2 weeks')).toEqual({ value: '2', unit: 'weeks' });
    expect(parseJobDuration('1 month')).toEqual({ value: '1', unit: 'months' });
    expect(parseJobDuration('3 years')).toEqual({ value: '3', unit: 'years' });
  });

  it('parses legacy duration ranges by using the first number', () => {
    expect(parseJobDuration('2-4 weeks')).toEqual({ value: '2', unit: 'weeks' });
  });

  it('returns an empty value for unsupported free-form duration text', () => {
    expect(parseJobDuration('a few weeks')).toEqual({ value: '', unit: 'weeks' });
  });

  it('formats duration with singular and plural units', () => {
    expect(formatJobDuration('1', 'weeks')).toBe('1 week');
    expect(formatJobDuration('2', 'weeks')).toBe('2 weeks');
    expect(formatJobDuration('1', 'months')).toBe('1 month');
    expect(formatJobDuration('3', 'years')).toBe('3 years');
  });

  it('validates positive whole numbers only', () => {
    expect(isValidJobDurationValue('')).toBe(true);
    expect(isValidJobDurationValue('1')).toBe(true);
    expect(isValidJobDurationValue('0')).toBe(false);
    expect(isValidJobDurationValue('-1')).toBe(false);
    expect(isValidJobDurationValue('1.5')).toBe(false);
  });
});
