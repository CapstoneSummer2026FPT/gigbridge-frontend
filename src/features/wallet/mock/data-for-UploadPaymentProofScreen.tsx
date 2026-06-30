export type PaymentProofStatus = 'not_uploaded' | 'pending_admin_review' | 'approved' | 'rejected';
export type PendingPaymentType = 'escrow' | 'subscription' | 'wallet_deposit';

export interface PendingPaymentProof {
  transactionId: string;
  paymentType: PendingPaymentType;
  title: string;
  description: string;
  amount: number;
  currency: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  referenceCode: string;
  dueAt: string;
  status: PaymentProofStatus;
  uploadedFileName?: string;
  uploadedFileUrl?: string;
  uploadedAt?: string;
  adminNote?: string;
}

export const PAYMENT_PROOF_STORAGE_KEY = 'gb_payment_proofs';

export const MOCK_PENDING_PAYMENT_PROOFS: PendingPaymentProof[] = [
  {
    transactionId: 'trans_4',
    paymentType: 'wallet_deposit',
    title: 'Wallet deposit via bank transfer',
    description: 'Manual bank transfer deposit awaiting admin verification.',
    amount: 250,
    currency: 'G-coin',
    bankName: 'GigBridge Escrow Bank',
    bankAccountName: 'GigBridge Payments LLC',
    bankAccountNumber: 'GB-2026-8842-1100',
    referenceCode: 'GB-PROOF-TRANS-4',
    dueAt: '2026-06-06T23:59:00Z',
    status: 'not_uploaded',
  },
  {
    transactionId: 'trans_sub_pending_1',
    paymentType: 'subscription',
    title: 'GigBridge Pro yearly subscription',
    description: 'Subscription payment by bank transfer. Pro features activate after approval.',
    amount: 299.99,
    currency: 'G-coin',
    bankName: 'GigBridge Escrow Bank',
    bankAccountName: 'GigBridge Payments LLC',
    bankAccountNumber: 'GB-2026-8842-1100',
    referenceCode: 'GB-SUB-2026-0091',
    dueAt: '2026-06-05T23:59:00Z',
    status: 'not_uploaded',
  },
  {
    transactionId: 'trans_escrow_pending_1',
    paymentType: 'escrow',
    title: 'Escrow funding for SaaS dashboard milestone',
    description: 'Milestone escrow will be credited after admin verifies the proof.',
    amount: 1500,
    currency: 'G-coin',
    bankName: 'GigBridge Escrow Bank',
    bankAccountName: 'GigBridge Escrow Holdings',
    bankAccountNumber: 'GB-ESCROW-2026-3318',
    referenceCode: 'GB-ESCROW-MIL-118',
    dueAt: '2026-06-07T23:59:00Z',
    status: 'not_uploaded',
  },
];

export function getStoredPaymentProofs(): PendingPaymentProof[] {
  try {
    const stored = localStorage.getItem(PAYMENT_PROOF_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_error) {
    localStorage.removeItem(PAYMENT_PROOF_STORAGE_KEY);
  }
  return MOCK_PENDING_PAYMENT_PROOFS;
}

export function saveStoredPaymentProofs(proofs: PendingPaymentProof[]) {
  localStorage.setItem(PAYMENT_PROOF_STORAGE_KEY, JSON.stringify(proofs));
}
