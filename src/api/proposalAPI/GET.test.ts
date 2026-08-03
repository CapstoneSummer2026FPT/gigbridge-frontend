import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiService } from '../../service/apiService';
import type { ProposalDto } from '../../types/models/Proposal';
import { normalizeProposalList, normalizeProposalPage, proposalGetAPI } from './GET';

const proposal = { proposalsId: 'proposal-1' } as ProposalDto;

describe('proposal GET response normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('normalizes camelCase, PascalCase, legacy array, and malformed page payloads', () => {
    expect(normalizeProposalPage({
      Items: [proposal],
      PageNumber: 2,
      TotalPages: 3,
      TotalCount: 21,
      HasPreviousPage: true,
      HasNextPage: true,
    })).toEqual({
      items: [proposal],
      pageNumber: 2,
      totalPages: 3,
      totalCount: 21,
      hasPreviousPage: true,
      hasNextPage: true,
    });

    expect(normalizeProposalPage([proposal])).toEqual({
      items: [proposal],
      pageNumber: 1,
      totalPages: 1,
      totalCount: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

    expect(normalizeProposalPage({ items: 'invalid' })).toEqual({
      items: [],
      pageNumber: 1,
      totalPages: 1,
      totalCount: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });
  });

  it('returns a normalized page from getMyProposals', async () => {
    vi.spyOn(apiService, 'get').mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        items: [proposal],
        pageNumber: 1,
        totalPages: 1,
        totalCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });

    const response = await proposalGetAPI.getMyProposals({ pageSize: 100 });

    expect(response.success).toBe(true);
    expect(response.data?.items).toEqual([proposal]);
  });

  it('turns a successful malformed response into a recoverable API failure', async () => {
    vi.spyOn(apiService, 'get').mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: { items: 'not-an-array' },
    });

    const response = await proposalGetAPI.getMyProposals();

    expect(response.success).toBe(false);
    expect(response.data?.items).toEqual([]);
    expect(response.message).toBe('The proposals API returned an invalid list response.');
  });
});
