import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminProposalsScreen from './AdminProposalsScreen';
import { adminGetAPI } from '../../../api/adminAPI/GET';

vi.mock('../../../api/adminAPI/GET',()=>({adminGetAPI:{getProposals:vi.fn()}}));
vi.mock('../../../api/adminAPI/PATCH',()=>({adminPatchAPI:{invalidateProposal:vi.fn(),restoreProposal:vi.fn()}}));

describe('Admin proposal management',()=>{
 it('renders lifecycle and moderation independently without a hard-delete action',async()=>{
  vi.mocked(adminGetAPI.getProposals).mockResolvedValue({success:true,statusCode:200,message:'ok',timestamp:'',data:{items:[{proposalId:'11111111-1111-1111-1111-111111111111',jobPostId:'j',jobPostTitle:'API build',clientId:'c',clientName:'Client',freelancerId:'f',freelancerName:'Freelancer',proposedBudget:100,estimatedDuration:'1 week',submittedAt:'2026-08-01T00:00:00Z',updatedAt:null,lifecycleStatus:2,moderationStatus:0,aiInterviewStatus:null,negotiationStatus:null,hasContract:false,contractId:null,contractStatus:null,hasReport:false,hasDispute:false,reportCount:0,disputeCount:0}],pageNumber:1,pageSize:20,totalCount:1,totalPages:1,hasPreviousPage:false,hasNextPage:false}});
  render(<MemoryRouter><AdminProposalsScreen/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByText('API build')).toBeInTheDocument());
  expect(screen.getAllByText('Shortlisted')).toHaveLength(2); expect(screen.getAllByText('Active')).toHaveLength(2); expect(screen.getByRole('button',{name:'Invalidate'})).toBeInTheDocument(); expect(screen.queryByRole('button',{name:/delete/i})).not.toBeInTheDocument();
 });
});
