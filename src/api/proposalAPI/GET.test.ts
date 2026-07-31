import { describe, expect, it } from 'vitest';
import type { ProposalDto } from '../../types/models/Proposal';
import { normalizeProposalList } from './GET';

const proposal = { proposalsId: 'proposal-1' } as ProposalDto;

describe('proposal GET response normalization', () => {
  it('extracts proposals from the paginated my-proposals response', () => {
    expect(normalizeProposalList({
      items: [proposal],
      pageNumber: 1,
      totalPages: 1,
      totalCount: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    })).toEqual([proposal]);
  });

  it('keeps array responses compatible and rejects malformed list data', () => {
    expect(normalizeProposalList([proposal])).toEqual([proposal]);
    expect(normalizeProposalList({ items: null })).toEqual([]);
    expect(normalizeProposalList(undefined)).toEqual([]);
  });
});
