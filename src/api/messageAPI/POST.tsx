import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { MessageResponse } from './GET';
import type { ContractStatus } from '../../types/models/Contract';

export interface SendMessageRequest {
  conversationId: string;
  clientMessageId: string;
  content?: string;
  replyToMessageId?: string;
  attachments?: any[];
}

export interface CreateFinalOfferRequest {
  conversationId: string;
  finalPrice: number;
  scopeSummary?: string;
  startDate?: string;
  endDate?: string;
  clientNote?: string;
}

export interface RespondFinalOfferRequest {
  negotiationOfferId: string;
  response: number; // Accept=0, RequestChange=1, Decline=2
  reason?: string;
}

export interface RespondFinalOfferResponse {
  contractId?: string | null;
  contractStatus?: ContractStatus | number | null;
  message?: string | null;
}

export const messagePostAPI = {
  /**
   * POST /api/messages
   */
  sendMessage: async (payload: SendMessageRequest): Promise<ApiResponse<MessageResponse>> => {
    return apiService.post<MessageResponse>('messages', {
      ...payload,
      attachments: payload.attachments ?? [],
    });
  },

  /**
   * POST /api/conversations/{conversationId}/read/{messageId}
   */
  markAsRead: async (conversationId: string, messageId: string): Promise<ApiResponse<boolean>> => {
    return apiService.post<boolean>(`conversations/${conversationId}/read/${messageId}`);
  },

  /**
   * POST /api/conversations/proposal/{proposalId}/negotiation
   */
  startNegotiationFromProposal: async (proposalId: string): Promise<ApiResponse<string>> => {
    return apiService.post<string>(`conversations/proposal/${proposalId}/negotiation`);
  },

  /**
   * POST /api/negotiation-offers
   */
  createFinalOffer: async (payload: CreateFinalOfferRequest): Promise<ApiResponse<string>> => {
    return apiService.post<string>('negotiation-offers', payload);
  },

  /**
   * POST /api/negotiation-offers/respond
   */
  respondFinalOffer: async (payload: RespondFinalOfferRequest): Promise<ApiResponse<RespondFinalOfferResponse>> => {
    return apiService.post<RespondFinalOfferResponse>('negotiation-offers/respond', payload);
  },
};
