import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { MessageResponse } from './GET';

export interface SendMessageAttachmentRequest {
  fileName: string;
  fileUrl: string;
  storageProvider: string;
  storageObjectKey?: string | null;
  mimeType: string;
  fileExtension?: string | null;
  fileSizeBytes: number;
}

export interface SendMessageRequest {
  conversationId: string;
  clientMessageId: string;
  content?: string | null;
  replyToMessageId?: string | null;
  attachments?: SendMessageAttachmentRequest[];
}

export interface CreateFinalOfferRequest {
  conversationId: string;
  finalPrice: number;
  scopeSummary?: string | null;
  startDate?: string | null; // ISO Date string (or format YYYY-MM-DD)
  endDate?: string | null;
  clientNote?: string | null;
}

export interface RespondFinalOfferRequest {
  negotiationOfferId: string;
  response: number; // 0=Accept, 1=RequestChange, 2=Decline
  reason?: string | null;
}

export const messagePostAPI = {
  sendMessage: async (data: SendMessageRequest): Promise<ApiResponse<MessageResponse>> => {
    return apiService.post<MessageResponse>('messages', data);
  },

  markAsRead: async (conversationId: string, messageId: string): Promise<ApiResponse<boolean>> => {
    return apiService.post<boolean>(`conversations/${conversationId}/read/${messageId}`);
  },

  createFinalOffer: async (data: CreateFinalOfferRequest): Promise<ApiResponse<string>> => {
    return apiService.post<string>('negotiation-offers', data);
  },

  respondFinalOffer: async (data: RespondFinalOfferRequest): Promise<ApiResponse<boolean>> => {
    return apiService.post<boolean>('negotiation-offers/respond', data);
  },
};
