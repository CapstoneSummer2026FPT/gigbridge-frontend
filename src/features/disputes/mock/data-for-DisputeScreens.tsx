import { ContractStatus } from '../../../types/models/Contract';

export type DisputeStatus = 'opened' | 'under_review' | 'resolved';
export type DisputeCategory = 'deliverable_quality' | 'payment' | 'scope' | 'communication' | 'other';
export type DisputeOutcome = 'full_refund' | 'partial_refund' | 'full_payment_to_freelancer';

export interface DisputeEvidenceFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSizeMb: number;
}

export interface DisputeRecord {
  id: string;
  contractId: string;
  contractTitle: string;
  contractStatus: ContractStatus;
  openedBy: 'Client' | 'Freelancer';
  openedByName: string;
  clientName: string;
  freelancerName: string;
  isPremiumClient: boolean;
  category: DisputeCategory;
  description: string;
  status: DisputeStatus;
  escrowBalance: number;
  evidenceFiles: DisputeEvidenceFile[];
  createdAt: string;
  aiSuggestion?: string;
  resolutionSummary?: string;
  outcome?: DisputeOutcome;
  refundAmount?: number;
}

export const MOCK_DISPUTES_FOR_SCREENS: DisputeRecord[] = [
  {
    id: 'disp_001',
    contractId: 'contract_mock_3',
    contractTitle: 'AI Interview Module Integration',
    contractStatus: ContractStatus.Disputed,
    openedBy: 'Client',
    openedByName: 'Jordan Mitchell',
    clientName: 'Jordan Mitchell',
    freelancerName: 'Demo Freelancer',
    isPremiumClient: true,
    category: 'deliverable_quality',
    description: 'The interview room UI does not match the agreed milestone acceptance criteria and multiple requested fixes remain unresolved.',
    status: 'opened',
    escrowBalance: 5600,
    evidenceFiles: [
      { id: 'ev_001', fileName: 'milestone-review-notes.pdf', fileUrl: '/evidence/milestone-review-notes.pdf', fileSizeMb: 2.4 },
      { id: 'ev_002', fileName: 'chat-export.png', fileUrl: '/evidence/chat-export.png', fileSizeMb: 1.1 },
    ],
    createdAt: '2026-06-01T11:00:00Z',
    aiSuggestion: 'AI suggests partial refund. Chat history shows scope was partially delivered, but acceptance criteria around room stability and score dashboard were not fully met.',
  },
  {
    id: 'disp_002',
    contractId: 'contract_mock_4',
    contractTitle: 'Data Pipeline Audit and Optimization',
    contractStatus: ContractStatus.Active,
    openedBy: 'Freelancer',
    openedByName: 'Marcus Rivera',
    clientName: 'Anika Sharma',
    freelancerName: 'Marcus Rivera',
    isPremiumClient: false,
    category: 'payment',
    description: 'The second milestone was approved but escrow release has been delayed beyond the agreed payment window.',
    status: 'under_review',
    escrowBalance: 3700,
    evidenceFiles: [
      { id: 'ev_003', fileName: 'approval-confirmation.pdf', fileUrl: '/evidence/approval-confirmation.pdf', fileSizeMb: 0.8 },
    ],
    createdAt: '2026-05-31T09:30:00Z',
  },
  {
    id: 'disp_003',
    contractId: 'contract_mock_1',
    contractTitle: 'SaaS Analytics Dashboard Contract',
    contractStatus: ContractStatus.Active,
    openedBy: 'Client',
    openedByName: 'Demo Client',
    clientName: 'Demo Client',
    freelancerName: 'Demo Freelancer',
    isPremiumClient: true,
    category: 'scope',
    description: 'The dashboard implementation includes additional modules that were not approved in the contract scope.',
    status: 'resolved',
    escrowBalance: 2500,
    evidenceFiles: [],
    createdAt: '2026-05-25T14:15:00Z',
    aiSuggestion: 'AI suggests reviewing change request history before payout.',
    resolutionSummary: 'Admin confirmed partial out-of-scope work and released approved milestone amount only.',
    outcome: 'partial_refund',
    refundAmount: 900,
  },
];
