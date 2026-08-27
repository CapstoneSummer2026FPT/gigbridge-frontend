import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ScheduleEvent } from '../scheduleAPI';
import type { NegotiationMilestoneDto, NegotiationOfferDetailDto } from '../../types/models/Message';

export interface ConversationSummaryResponse {
  conversationId: string;
  conversationType: number;
  title?: string | null;
  jobPostId?: string | null;
  proposalId?: string | null;
  contractId?: string | null;
  disputeId?: string | null;
  status: number;
  unreadCount: number;
  createdAt: string;
  lastMessageAt?: string | null;
  lastMessage?: any | null;
  otherParticipantId?: string | null;
  otherParticipantName?: string | null;
  otherParticipantAvatar?: string | null;
  otherParticipantRole?: number | null;
  otherParticipantCompany?: string | null;
  otherParticipantRoleTitle?: string | null;
  lastOfferId?: string | null;
  lastOfferPrice?: number | null;
  lastOfferStatus?: number | null;
  jobBudgetMin?: number | null;
  jobBudgetMax?: number | null;
  jobCurrency?: string | null;
  jobCategoryName?: string | null;
  proposalBudget?: number | null;
  proposalDuration?: string | null;
  jobStatus?: number | null;
  jobVisibility?: number | null;
  canNegotiate?: boolean;
}

export interface MessageAttachmentResponse {
  messageAttachmentId: string;
  fileName: string;
  fileUrl: string;
  storageProvider: string;
  storageObjectKey?: string | null;
  mimeType: string;
  fileExtension?: string | null;
  fileSizeBytes: number;
  createdAt: string;
}

export interface MessageResponse {
  messageId: string;
  conversationId: string;
  senderUserId?: string | null;
  messageType: number;
  content?: string | null;
  replyToMessageId?: string | null;
  metadata?: string | null;
  clientMessageId?: string | null;
  sentAt: string;
  editedAt?: string | null;
  isDeleted: boolean;
  attachments: MessageAttachmentResponse[];
  schedule?: ScheduleEvent | null;
  senderName?: string | null;
  senderAvatar?: string | null;
  senderRole?: number | null;
  disputeRecipient?: DisputeMessageRecipient | null;
}

export enum DisputeMessageRecipient {
  Client = 0,
  Freelancer = 1,
  Both = 2,
}

export interface ConversationUpdatedEvent {
  conversationId: string;
  lastMessage?: MessageResponse | null;
  lastMessageAt?: string | null;
  unreadCount: number;
}

export interface ConversationUnreadCountResponse {
  unreadCount: number;
}

export interface ConversationInboxStatusResponse extends ConversationUnreadCountResponse {
  revision: number;
}

export interface ConversationInboxRevisionChangedEvent extends ConversationInboxStatusResponse {
  conversationId?: string | null;
  changeKind: 'upsert' | 'reset' | string;
}

export interface NegotiationMilestonePlanUpdatedEvent {
  conversationId: string;
  updatedByUserId: string;
  updatedAt: string;
}

export interface FinalOfferCreatedEvent {
  conversationId: string;
  offerId: string;
  messageId: string;
}

export interface FinalOfferRespondedEvent {
  conversationId: string;
  offerId: string;
  status: number;
  response: 'Accept' | 'RequestChange' | 'Decline' | string;
  contractId?: string | null;
  messageId?: string | null;
}

interface ConversationSummaryPageResponse {
  items: ConversationSummaryResponse[];
  nextCursor?: string | null;
}

export interface ConversationMessageResponse extends MessageResponse { }

export const messageGetAPI = {
  /**
   * GET /api/conversations
   */
  getConversations: async (): Promise<ApiResponse<ConversationSummaryResponse[]>> => {
    const response = await apiService.get<ConversationSummaryPageResponse>('conversations/summary', { pageSize: 50 });
    return { ...response, data: response.data?.items };
  },

  /**
   * GET /api/conversations (alias to getConversations)
   */
  getMyConversations: async (): Promise<ApiResponse<ConversationSummaryResponse[]>> => {
    const response = await apiService.get<ConversationSummaryPageResponse>('conversations/summary', { pageSize: 50 });
    return { ...response, data: response.data?.items };
  },

  /**
   * GET /api/conversations/unread-count
   */
  getUnreadCount: async (): Promise<ApiResponse<ConversationUnreadCountResponse>> => {
    return apiService.get<ConversationUnreadCountResponse>('conversations/unread-count');
  },

  getInboxStatus: async (): Promise<ApiResponse<ConversationInboxStatusResponse>> =>
    apiService.get<ConversationInboxStatusResponse>('conversations/inbox-status'),

  getConversationSummary: async (conversationId: string): Promise<ApiResponse<ConversationSummaryResponse>> =>
    apiService.get<ConversationSummaryResponse>(`conversations/${conversationId}/summary`),

  /**
   * GET /api/messages/conversation/{conversationId}
   */
  getConversationMessages: async (
    conversationId: string,
    before?: string,
    pageSize: number = 30
  ): Promise<ApiResponse<ConversationMessageResponse[]>> => {
    const params: Record<string, any> = { pageSize };
    if (before) {
      params.before = before;
    }
    return apiService.get<ConversationMessageResponse[]>(`messages/conversation/${conversationId}`, params);
  },

  getMessagesAround: async (conversationId: string, messageId: string, radius: number = 20): Promise<ApiResponse<ConversationMessageResponse[]>> =>
    apiService.get<ConversationMessageResponse[]>(`messages/conversation/${conversationId}/around/${messageId}`, { radius }),

  getNegotiationMilestonePlan: async (conversationId: string): Promise<ApiResponse<NegotiationMilestoneDto[]>> =>
    apiService.get<NegotiationMilestoneDto[]>(`negotiation-offers/conversations/${conversationId}/milestone-plan`),

  getNegotiationOfferDetail: async (offerId: string): Promise<ApiResponse<NegotiationOfferDetailDto>> =>
    apiService.get<NegotiationOfferDetailDto>(`negotiation-offers/${offerId}`),
};
