import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminProposalsScreen from './AdminProposalsScreen';
import { adminGetAPI } from '../../../api/adminAPI/GET';

vi.mock('../../../api/adminAPI/GET',()=>({adminGetAPI:{getProposals:vi.fn()}}));
vi.mock('../../../api/adminAPI/PATCH',()=>({adminPatchAPI:{invalidateProposal:vi.fn(),restoreProposal:vi.fn()}}));
vi.mock('../../../shared/components/AppLayout',()=>({AppLayout:({children}:{children:React.ReactNode})=><>{children}</>}));

describe('Admin proposal management',()=>{
 it('renders lifecycle and moderation independently without a hard-delete action',async()=>{
  vi.mocked(adminGetAPI.getProposals).mockResolvedValue({success:true,statusCode:200,message:'ok',data:{items:[{proposalId:'11111111-1111-1111-1111-111111111111',jobPostId:'j',jobPostTitle:'API build',clientId:'c',clientName:'Client',clientAvatar:null,freelancerId:'f',freelancerName:'Freelancer',freelancerAvatar:null,proposedBudget:100,estimatedDuration:'1 week',submittedAt:'2026-08-01T00:00:00Z',updatedAt:null,lifecycleStatus:2,moderationStatus:0,aiInterviewStatus:null,negotiationStatus:null,hasContract:false,contractId:null,contractStatus:null,hasReport:false,hasDispute:false,reportCount:0,disputeCount:0}],pageNumber:1,pageSize:20,totalCount:1,totalPages:1,hasPreviousPage:false,hasNextPage:false}});
  render(<MemoryRouter><AdminProposalsScreen/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByText('API build')).toBeInTheDocument());
  const row = screen.getByText('API build').closest('tr');
  expect(row).not.toBeNull();
  expect(within(row!).getByText('Shortlisted')).toBeInTheDocument();
  expect(within(row!).getByText('Active')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /actions for proposal/i }));
  expect(screen.getByRole('button',{name:'Invalidate'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/delete/i})).not.toBeInTheDocument();
 });
});
