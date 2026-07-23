import { describe, expect, it } from 'vitest';
import {
  calculateProposalBudget,
  calculateProposalDuration,
  parseProposalDuration,
  proposalDurationsEqual,
} from './proposalTotals';

describe('proposal totals', () => {
  it('sums milestone amounts with currency precision', () => {
    expect(calculateProposalBudget([100, 250, 150])).toBe(500);
    expect(calculateProposalBudget([0.1, 0.2])).toBe(0.3);
  });

  it('keeps days when all milestone durations use days', () => {
    expect(calculateProposalDuration(['5 days', '8 days', '7 days'])).toBe('20 days');
  });

  it('rounds up using the largest milestone unit', () => {
    expect(calculateProposalDuration(['3 weeks', '5 days'])).toBe('4 weeks');
    expect(calculateProposalDuration(['1 month', '6 weeks'])).toBe('3 months');
    expect(calculateProposalDuration(['1 year', '6 months'])).toBe('2 years');
  });

  it('supports singular units and rejects invalid durations', () => {
    expect(parseProposalDuration('1 day')).toEqual({ amount: 1, unit: 'days' });
    expect(parseProposalDuration('2 years')).toEqual({ amount: 2, unit: 'years' });
    expect(parseProposalDuration('1.5 weeks')).toBeNull();
    expect(parseProposalDuration('0 days')).toBeNull();
  });

  it('compares equivalent duration values across units', () => {
    expect(proposalDurationsEqual('7 days', '1 week')).toBe(true);
    expect(proposalDurationsEqual('8 days', '1 week')).toBe(false);
  });
});
