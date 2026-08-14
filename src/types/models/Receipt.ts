export type ProjectReceiptGenerationStatus = 'Pending' | 'Processing' | 'Ready' | 'Failed';
export type ProjectReceiptEmailStatus = 'Pending' | 'Delivered' | 'Failed';
export type ProjectReceiptType = 'Client' | 'Freelancer';

export interface ProjectReceiptSummary {
  receiptId: string;
  contractId: string;
  projectTitle: string;
  receiptNumber: string;
  receiptType: ProjectReceiptType;
  issuedAt: string;
  generationStatus: ProjectReceiptGenerationStatus;
  emailStatus: ProjectReceiptEmailStatus;
  downloadReady: boolean;
  canRetry: boolean;
  generatedAt?: string | null;
  emailedAt?: string | null;
}

export interface ProjectReceiptPage {
  items: ProjectReceiptSummary[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
