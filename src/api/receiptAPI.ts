import { apiService } from '../service/apiService';
import type { ApiResponse } from '../types/common';
import type {
  ProjectReceiptEmailStatus,
  ProjectReceiptGenerationStatus,
  ProjectReceiptPage,
  ProjectReceiptSummary,
  ProjectReceiptType,
} from '../types/models/Receipt';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const field = (source: UnknownRecord, camel: string, pascal: string): unknown =>
  source[camel] ?? source[pascal];

const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const number = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeProjectReceipt = (value: unknown): ProjectReceiptSummary => {
  const source = isRecord(value) ? value : {};

  return {
    receiptId: text(field(source, 'receiptId', 'ReceiptId')),
    contractId: text(field(source, 'contractId', 'ContractId')),
    projectTitle: text(field(source, 'projectTitle', 'ProjectTitle'), 'Project'),
    receiptNumber: text(field(source, 'receiptNumber', 'ReceiptNumber')),
    receiptType: text(field(source, 'receiptType', 'ReceiptType'), 'Client') as ProjectReceiptType,
    issuedAt: text(field(source, 'issuedAt', 'IssuedAt')),
    generationStatus: text(
      field(source, 'generationStatus', 'GenerationStatus'),
      'Pending',
    ) as ProjectReceiptGenerationStatus,
    emailStatus: text(field(source, 'emailStatus', 'EmailStatus'), 'Pending') as ProjectReceiptEmailStatus,
    downloadReady: Boolean(field(source, 'downloadReady', 'DownloadReady')),
    canRetry: Boolean(field(source, 'canRetry', 'CanRetry')),
    generatedAt: text(field(source, 'generatedAt', 'GeneratedAt')) || null,
    emailedAt: text(field(source, 'emailedAt', 'EmailedAt')) || null,
    revision: number(field(source, 'revision', 'Revision'), 0),
  };
};

const normalizeReceiptResponse = (
  response: ApiResponse<unknown>,
): ApiResponse<ProjectReceiptSummary> => ({
  ...response,
  data: response.data === undefined ? undefined : normalizeProjectReceipt(response.data),
});

const normalizeReceiptPage = (value: unknown): ProjectReceiptPage => {
  const source = isRecord(value) ? value : {};
  const rawItems = field(source, 'items', 'Items');
  const pageNumber = number(field(source, 'pageNumber', 'PageNumber'), 1);
  const pageSize = number(field(source, 'pageSize', 'PageSize'), 10);
  const totalCount = number(field(source, 'totalCount', 'TotalCount'), 0);
  const totalPages = number(
    field(source, 'totalPages', 'TotalPages'),
    Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize))),
  );

  return {
    items: Array.isArray(rawItems) ? rawItems.map(normalizeProjectReceipt) : [],
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: Boolean(field(source, 'hasPreviousPage', 'HasPreviousPage')),
    hasNextPage: Boolean(field(source, 'hasNextPage', 'HasNextPage')),
  };
};

export const receiptAPI = {
  prepare: async (contractId: string): Promise<ApiResponse<ProjectReceiptSummary>> =>
    normalizeReceiptResponse(
      await apiService.post<unknown>(`contracts/${contractId}/receipts/prepare`),
    ),

  getMine: async (page = 1, pageSize = 10): Promise<ApiResponse<ProjectReceiptPage>> => {
    const response = await apiService.get<unknown>('receipts', { page, pageSize });
    return {
      ...response,
      data: response.data === undefined ? undefined : normalizeReceiptPage(response.data),
    };
  },

  getStatus: async (receiptId: string): Promise<ApiResponse<ProjectReceiptSummary>> =>
    normalizeReceiptResponse(await apiService.get<unknown>(`receipts/${receiptId}/status`)),

  getStatusByContract: async (contractId: string): Promise<ApiResponse<ProjectReceiptSummary>> =>
    normalizeReceiptResponse(await apiService.get<unknown>(`contracts/${contractId}/receipt/status`)),

  download: (receiptId: string): Promise<ApiResponse<Blob>> =>
    apiService.download(`receipts/${receiptId}/download`),

  retry: async (receiptId: string): Promise<ApiResponse<ProjectReceiptSummary>> =>
    normalizeReceiptResponse(await apiService.post<unknown>(`receipts/${receiptId}/retry`)),
};
