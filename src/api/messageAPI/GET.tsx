import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';

export interface MessageResponse {
  messagesId: string;
  conversationsId: string;
  senderUserId?: string | null;
  messageType: number; // 0=Text, 1=Image, 2=File, 3=System, 4=FinalOffer, ...
  content?: string | null;
  metadata?: string | null;
  sentAt: string;
  isDeleted: boolean;
}

export interface ConversationSummaryResponse {
  conversationId: string;
  conversationType: number; // 0=JobNegotiation, 1=ContractWorkroom, 2=Dispute, 3=Support, 4=JobInvitedRoom
  title?: string | null;
  jobPostId?: string | null;
  proposalId?: string | null;
  contractId?: string | null;
  disputeId?: string | null;
  status: number; // 0=Active, 1=Archived, 2=Closed
  unreadCount: number;
  createdAt: string;
  lastMessageAt?: string | null;
  lastMessage?: MessageResponse | null;
  otherParticipantId?: string | null;
  otherParticipantName?: string | null;
  otherParticipantAvatar?: string | null;
  otherParticipantRole?: number | null;
  otherParticipantCompany?: string | null;
  otherParticipantRoleTitle?: string | null;
  lastOfferId?: string | null;
  lastOfferPrice?: number | null;
  lastOfferStatus?: number | null;
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

export interface ConversationMessageResponse {
  messageId: string;
  conversationId: string;
  senderUserId?: string | null;
  messageType: number;
  content?: string | null;
  replyToMessageId?: string | null;
  metadata?: string | null;
  sentAt: string;
  editedAt?: string | null;
  isDeleted: boolean;
  attachments: MessageAttachmentResponse[];
}

export const messageGetAPI = {
  getMyConversations: async (): Promise<ApiResponse<ConversationSummaryResponse[]>> => {
    return apiService.get<ConversationSummaryResponse[]>('conversations');
  },

  getConversationMessages: async (
    conversationId: string,
    params?: { before?: string; pageSize?: number }
  ): Promise<ApiResponse<ConversationMessageResponse[]>> => {
    return apiService.get<ConversationMessageResponse[]>(
      `messages/conversation/${conversationId}`,
      params || {}
    );
  },
};
