import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  EloAppeal,
  EloAppealDetail,
  EloSummary,
  EloTransaction,
  EloTransactionDetail,
  MyEloAppealsQuery,
  PaginatedElo,
  EloHistoryQuery,
} from '../../types/elo';

export const eloGetAPI = {
  /** GET /api/elo/summary — current score + lifetime gained/lost + recent rows. */
  getEloSummary: (): Promise<ApiResponse<EloSummary>> =>
    apiService.get<EloSummary>('elo/summary'),

  /** GET /api/elo/history — paginated, filterable ledger for the signed-in user. */
  getEloHistory: (params: EloHistoryQuery = {}): Promise<ApiResponse<PaginatedElo<EloTransaction>>> =>
    apiService.get<PaginatedElo<EloTransaction>>('elo/history', params),

  /** GET /api/elo/history/{transactionId} — a single transaction + active appeal. */
  getEloTransactionDetail: (transactionId: string): Promise<ApiResponse<EloTransactionDetail>> =>
    apiService.get<EloTransactionDetail>(`elo/history/${transactionId}`),

  /** GET /api/elo/appeals — the signed-in user's appeals. */
  getMyEloAppeals: (params: MyEloAppealsQuery = {}): Promise<ApiResponse<PaginatedElo<EloAppeal>>> =>
    apiService.get<PaginatedElo<EloAppeal>>('elo/appeals', params),

  /** GET /api/elo/appeals/{appealId} — appeal detail (owner only). */
  getEloAppealDetail: (appealId: string): Promise<ApiResponse<EloAppealDetail>> =>
    apiService.get<EloAppealDetail>(`elo/appeals/${appealId}`),
};
