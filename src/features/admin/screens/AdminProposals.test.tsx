import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminProposalsScreen from './AdminProposalsScreen';
import { adminGetAPI } from '../../../api/adminAPI/GET';

vi.mock('../../../api/adminAPI/GET',()=>({adminGetAPI:{getProposals:vi.fn()}}));
vi.mock('../../../api/adminAPI/PATCH',()=>({adminPatchAPI:{invalidateProposal:vi.fn(),restoreProposal:vi.fn()}}));
vi.mock('../../../shared/components/AppLayout',()=>({AppLayout:({children}:{children:React.ReactNode})=><>{children}</>}));

const proposalItem = {
  proposalId:'11111111-1111-1111-1111-111111111111',jobPostId:'j',jobPostTitle:'API build',clientId:'c',clientName:'Client',clientAvatar:null,
  freelancerId:'f',freelancerName:'Freelancer',freelancerAvatar:null,proposedBudget:100,estimatedDuration:'1 week',
  submittedAt:'2026-08-01T00:00:00Z',updatedAt:null,lifecycleStatus:2,moderationStatus:0,aiInterviewStatus:null,
  negotiationStatus:null,hasContract:false,contractId:null,contractStatus:null,hasReport:false,hasDispute:false,reportCount:0,disputeCount:0,
};

describe('Admin proposal management',()=>{
 beforeEach(()=>{ vi.resetAllMocks(); });
 it('renders lifecycle and moderation independently without a hard-delete action',async()=>{
  vi.mocked(adminGetAPI.getProposals).mockResolvedValue({success:true,statusCode:200,message:'ok',data:{items:[proposalItem],pageNumber:1,pageSize:20,totalCount:1,totalPages:1,hasPreviousPage:false,hasNextPage:false}} as never);
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
 it('requests the next page and maps pagination totals',async()=>{
  const secondItem = { ...proposalItem, proposalId:'22222222-2222-2222-2222-222222222222', jobPostTitle:'API build v2' };
  vi.mocked(adminGetAPI.getProposals).mockImplementation(async (params) => {
    const page = params?.page ?? 1;
    return page === 2
      ? {success:true,statusCode:200,message:'ok',data:{items:[secondItem],pageNumber:2,pageSize:20,totalCount:21,totalPages:2,hasPreviousPage:true,hasNextPage:false}} as never
      : {success:true,statusCode:200,message:'ok',data:{items:[proposalItem],pageNumber:1,pageSize:20,totalCount:21,totalPages:2,hasPreviousPage:false,hasNextPage:true}} as never;
  });
  const paginationSummary = (text: string) => screen.getByText((_content, element) => element?.tagName === 'P' && element.textContent === text);
  render(<MemoryRouter><AdminProposalsScreen/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByText('API build')).toBeInTheDocument());
  expect(paginationSummary('Showing 1-20 of 21 matching proposals')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Next'}));
  await waitFor(()=>expect(adminGetAPI.getProposals).toHaveBeenLastCalledWith(expect.objectContaining({page:2})));
  expect(paginationSummary('Showing 21-21 of 21 matching proposals')).toBeInTheDocument();
 });
 it('shows an error state with a working retry button',async()=>{
  vi.mocked(adminGetAPI.getProposals).mockResolvedValue({success:false,statusCode:500,message:'boom',data:undefined} as never);
  render(<MemoryRouter><AdminProposalsScreen/></MemoryRouter>);
  expect(await screen.findByText(/proposals could not be loaded/i)).toBeInTheDocument();
  vi.mocked(adminGetAPI.getProposals).mockResolvedValue({success:true,statusCode:200,message:'ok',data:{items:[proposalItem],pageNumber:1,pageSize:20,totalCount:1,totalPages:1,hasPreviousPage:false,hasNextPage:false}} as never);
  fireEvent.click(screen.getByRole('button',{name:/retry/i}));
  await waitFor(()=>expect(screen.getByText('API build')).toBeInTheDocument());
  expect(adminGetAPI.getProposals).toHaveBeenCalledTimes(2);
 });
});
