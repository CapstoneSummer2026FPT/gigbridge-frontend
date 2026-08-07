import { describe, expect, it } from 'vitest';
import { getProposalCreatePath } from '../../utils/proposalRoutes';

describe('getProposalCreatePath', () => {
  it('routes Apply Now to the Phase 2 proposal editor', () => {
    expect(getProposalCreatePath('job-1')).toBe('/proposals/create/job-1');
  });

  it('preserves invitation context', () => {
    expect(getProposalCreatePath('job-1', 'invite-1'))
      .toBe('/proposals/create/job-1?invitationId=invite-1');
  });
});
