import { describe, expect, it } from 'vitest';
import { normalizeAdminProposalDetail } from './proposalUtils';

describe('normalizeAdminProposalDetail', () => {
  it('returns empty arrays for missing optional collections', () => {
    const detail = normalizeAdminProposalDetail({ proposalId: 'p1' });
    expect(detail.answers).toEqual([]);
    expect(detail.milestones).toEqual([]);
    expect(detail.unassignedWorkItems).toEqual([]);
    expect(detail.negotiationHistory).toEqual([]);
    expect(detail.reports).toEqual([]);
    expect(detail.contractReports).toEqual([]);
    expect(detail.disputes).toEqual([]);
    expect(detail.internalNotes).toEqual([]);
    expect(detail.auditHistory).toEqual([]);
    expect(detail.requiredSkills).toEqual([]);
    expect(detail.client.userId).toBe('');
    expect(detail.freelancer.name).toBe('');
  });

  it('maps a camelCase backend payload into the full contract shape', () => {
    const detail = normalizeAdminProposalDetail({
      proposalId: 'p1',
      jobPostTitle: 'Build app',
      moderationStatus: 1,
      client: { userId: 'c1', name: 'Client A', skills: ['React'] },
      freelancer: { userId: 'f1', name: 'F A', summary: 'dev', eloPoints: 120 },
      answers: [{ questionId: 'q1', question: 'Q?', order: 0, required: true, answer: 'A' }],
      milestones: [{
        milestoneId: 'm1', title: 'M1', amount: 100, order: 0,
        workItems: [{ workItemId: 'w1', title: 'W', order: 0 }],
      }],
      negotiationHistory: [{ offerId: 'o1', createdAt: '2026-08-01', budget: 100, milestones: [] }],
      aiInterview: { attemptStatus: 1, answers: [] },
      contract: {
        contractId: 'ct1', title: 'C', status: 0, budget: 100, createdAt: '2026-08-01',
        milestoneCount: 1, contractReportCount: 0, disputeCount: 0,
      },
      reports: [{ id: 'r1', kind: 'Report', relation: 'x', status: 0, createdAt: '2026-08-01' }],
      auditHistory: [{ auditId: 'a1', action: 'Invalidated', correlationId: 'corr', createdAt: '2026-08-01' }],
    });
    expect(detail.client.userId).toBe('c1');
    expect(detail.client.skills).toEqual(['React']);
    expect(detail.freelancer.eloPoints).toBe(120);
    expect(detail.answers[0].answer).toBe('A');
    expect(detail.milestones[0].workItems).toHaveLength(1);
    expect(detail.negotiationHistory[0].createdAt).toBe('2026-08-01');
    expect(detail.aiInterview?.attemptStatus).toBe(1);
    expect(detail.contract?.contractId).toBe('ct1');
    expect(detail.reports).toHaveLength(1);
    expect(detail.auditHistory[0].action).toBe('Invalidated');
  });

  it('tolerates PascalCase keys and absent nested objects', () => {
    const detail = normalizeAdminProposalDetail({
      ProposalId: 'p2',
      JobPostTitle: 'X',
      ModerationStatus: 0,
      Client: { UserId: 'c2', Name: 'C' },
      Freelancer: { UserId: 'f2', Name: 'F' },
      AiInterview: null,
      Contract: null,
    });
    expect(detail.proposalId).toBe('p2');
    expect(detail.client.name).toBe('C');
    expect(detail.freelancer.userId).toBe('f2');
    expect(detail.answers).toEqual([]);
    expect(detail.aiInterview).toBeNull();
    expect(detail.contract).toBeNull();
  });

  it('keeps null aiInterview and contract absent without throwing', () => {
    const detail = normalizeAdminProposalDetail({ proposalId: 'p3', aiInterview: null, contract: null });
    expect(detail.aiInterview).toBeNull();
    expect(detail.contract).toBeNull();
  });
});
