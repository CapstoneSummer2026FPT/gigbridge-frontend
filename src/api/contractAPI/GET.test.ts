import { describe, expect, it } from 'vitest';
import { normalizeContract, normalizeMilestoneAttachment } from './GET';

describe('contract GET response normalization', () => {
  it('normalizes PascalCase milestone attachment payloads', () => {
    const attachment = normalizeMilestoneAttachment({
      MilestoneAttachmentsId: 'attachment-1',
      MilestonesId: 'milestone-1',
      FileName: 'final-deliverable.zip',
      FileUrl: 'https://example.com/final-deliverable.zip',
      FileSize: 12345,
      SourceType: 0,
      MimeType: 'application/zip',
      UploadedByUserId: 'user-1',
      CreatedAt: '2026-07-02T01:00:00.000Z',
    });

    expect(attachment).toEqual({
      id: 'attachment-1',
      milestone_id: 'milestone-1',
      file_name: 'final-deliverable.zip',
      file_url: 'https://example.com/final-deliverable.zip',
      file_size: 12345,
      source_type: 0,
      mime_type: 'application/zip',
      uploaded_by_user_id: 'user-1',
      created_at: '2026-07-02T01:00:00.000Z',
    });
  });

  it('preserves the backend escrow funding quote', () => {
    const contract = normalizeContract({
      ContractId: 'contract-1',
      JobPostId: 'job-1',
      ClientProfileId: 'client-1',
      Title: 'Escrow contract',
      // Contract/escrow amounts are G-coin: TotalBudget and RequiredAmount are 1_000 G-coin.
      TotalBudget: 1_000,
      Status: 5,
      CreatedAt: '2026-07-28T00:00:00.000Z',
      Escrow: {
        ContractEscrowId: 'escrow-1',
        RequiredAmount: 1_000,
        RequiredTokens: 1_000,
        FundingFeeRate: 0.01,
        FundingFeeVnd: 10_000,
        FundingFeeTokens: 10,
        TotalDebitTokens: 1_010,
        FundedAmount: 0,
        ReleasedAmount: 0,
        RequiredPercentage: 1,
        Currency: 'VND',
        Status: 0,
        CreatedAt: '2026-07-28T00:00:00.000Z',
      },
    });

    expect(contract.escrow).toEqual({
      contractEscrowId: 'escrow-1',
      requiredAmount: 1_000,
      requiredTokens: 1_000,
      fundingFeeRate: 0.01,
      fundingFeeVnd: 10_000,
      fundingFeeTokens: 10,
      totalDebitTokens: 1_010,
      fundedAmount: 0,
      releasedAmount: 0,
      requiredPercentage: 1,
      currency: 'VND',
      status: 0,
      createdAt: '2026-07-28T00:00:00.000Z',
      fundedAt: null,
    });
  });
});
