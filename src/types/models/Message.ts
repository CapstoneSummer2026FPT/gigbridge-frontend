/**
 * Message & Conversation Models
 * Mirrors backend Domain.Entities: Message, MessageAttachment, Conversation, ConversationParticipant
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/**
 * Enum MessageType: 0=Text, 1=Image, 2=File, 3=System,
 * 4=FinalOffer, 5=ContractEvent, 6=MilestoneEvent, 7=PaymentEvent, 8=DisputeEvent
 */
export enum MessageType {
  Text = 0,
  Image = 1,
  File = 2,
  System = 3,
  FinalOffer = 4,
  ContractEvent = 5,
  MilestoneEvent = 6,
  PaymentEvent = 7,
  DisputeEvent = 8,
  AdminOfficial = 10,
}

/**
 * Enum ConversationType: 0=JobNegotiation, 1=ContractWorkroom, 2=Dispute, 3=Support
 */
export enum ConversationType {
  JobNegotiation = 0,
  ContractWorkroom = 1,
  Dispute = 2,
  Support = 3,
  JobInvitedRoom = 4,
}

/**
 * Enum ConversationStatus: 0=Active, 1=Archived, 2=Closed
 */
export enum ConversationStatus {
  Active = 0,
  Archived = 1,
  Closed = 2,
}

/**
 * Enum ParticipantRole: 0=Client, 1=Freelancer, 2=Admin, 3=Support
 */
export enum ParticipantRole {
  Client = 0,
  Freelancer = 1,
  Admin = 2,
  Support = 3,
}

export enum DisputeMessageRecipient {
  Client = 0,
  Freelancer = 1,
  Both = 2,
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

/** Mirrors backend: Domain.Entities.MessageAttachment */
export interface IMessageAttachment {
  messageAttachmentsId: string;
  messagesId: string;
  fileName: string;
  fileUrl: string;
  storageProvider: string;
  storageObjectKey?: string | null;
  mimeType: string;
  fileExtension?: string | null;
  fileSizeBytes: number;
  createdAt: string; // ISO 8601
}

/** Mirrors backend: Domain.Entities.Message */
export interface IMessage {
  messagesId: string;
  conversationsId: string;
  senderUserId?: string | null;
  messageType: MessageType;
  content?: string | null;
  replyToMessageId?: string | null;
  metadata?: string | null;          // JSON string – varies by messageType
  clientMessageId?: string | null;   // Optimistic-UI dedup key
  sentAt: string;                    // ISO 8601
  editedAt?: string | null;
  deletedForEveryoneAt?: string | null;
  deletedForSenderAt?: string | null;
  disputeRecipient?: DisputeMessageRecipient | null;

  // Navigation (populated when included by API)
  messageAttachments?: IMessageAttachment[];
  replyToMessage?: IMessage | null;
}

/** Mirrors backend: Domain.Entities.ConversationParticipant */
export interface IConversationParticipant {
  conversationParticipantId: string;
  conversationsId: string;
  userId: string;
  participantRole: ParticipantRole;
  joinedAt: string;   // ISO 8601
  leftAt?: string | null;
  lastReadMessageId?: string | null;
  lastReadAt?: string | null;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  isArchived: boolean;
  deletedAt?: string | null;
}

/** Mirrors backend: Domain.Entities.Conversation */
export interface IConversation {
  conversationsId: string;
  conversationType: ConversationType;
  title?: string | null;
  jobPostsId?: string | null;
  proposalsId?: string | null;
  contractsId?: string | null;
  disputesId?: string | null;
  createdByUserId: string;
  lastMessageId?: string | null;
  lastMessageAt?: string | null;
  status: ConversationStatus;
  createdAt: string;   // ISO 8601
  updatedAt?: string | null;
  deletedAt?: string | null;

  // Navigation (populated when included by API)
  lastMessage?: IMessage | null;
  messages?: IMessage[];
  participants?: IConversationParticipant[];
}

// ─── Legacy / Review ──────────────────────────────────────────────────────────

export type RoomType = 'invited' | 'negotiation' | 'workspace' | 'dispute';

export interface JobInfo {
  id: string;
  title: string;
  budget: string;
  category: string;
  status?: number | null;
  visibility?: number | null;
}

export interface MsgConversation {
  id: string;
  roomType: RoomType;
  roomId: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantRole: string;
  participantCompany: string;
  participantOnline: boolean;
  job: JobInfo;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isMuted: boolean;
  dealStatus?: 'idle' | 'pending_freelancer' | 'agreed' | 'declined' | 'pending_client';
  proposedPrice?: string;
  conversationType?: number; // 0=JobNegotiation, 1=ContractWorkroom, etc.
  proposalId?: string | null;
  contractId?: string | null;
  disputeId?: string | null;
  lastOfferId?: string | null;
  proposalBudget?: number | null;
  proposalDuration?: string | null;
  jobStatus?: number | null;
  jobVisibility?: number | null;
  canNegotiate?: boolean;
  contractStatus?: number | null;
  status?: ConversationStatus | null;
}

export interface NegotiationWorkItemDto {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  deliverables?: string | null;
  estimatedDuration?: string | null;
  orderIndex: number;
}

export interface NegotiationMilestoneDto {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  amount: number;
  estimatedDuration?: string | null;
  dueDate?: string | null;
  deliverables?: string | null;
  acceptanceCriteria?: string | null;
  orderIndex: number;
  workItems: NegotiationWorkItemDto[];
}

export interface NegotiationOfferDetailDto {
  negotiationOfferId: string;
  conversationId: string;
  finalPrice: number;
  scopeSummary?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  clientNote?: string | null;
  status: number;
  createdAt: string;
  respondedAt?: string | null;
  milestones: NegotiationMilestoneDto[];
}

/** @deprecated Use IMessage instead */
export interface Message {
  id: string;
  content: string;
  conversationId?: string;
  senderId?: string;
  senderName?: string | null;
  senderAvatar?: string | null;
  senderRole?: number | null;
  disputeRecipient?: DisputeMessageRecipient | null;
  clientMessageId?: string | null;
  type?: string; // 'text' | 'file' | 'deal' | 'negotiation_request' | 'system'
  messageType?: MessageType | number;
  metadata?: string | null;
  createdAt?: string;
  isRead?: boolean;
  sendStatus?: 'pending' | 'sent' | 'failed';
  sendError?: string;
  fileUrl?: string;
  fileName?: string;
  attachments?: Array<{
    messageAttachmentId: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSizeBytes: number;
    createdAt: string;
  }>;
  dealStatus?: 'pending_freelancer' | 'agreed' | 'declined' | 'pending_client' | 'idle';
  negotiationStatus?: 'pending' | 'accepted' | 'declined';
  proposedPrice?: string;
  negotiationOfferId?: string | null;
  offerDetail?: NegotiationOfferDetailDto | null;
  schedule?: import('../../api/scheduleAPI').ScheduleEvent;
}

export interface Review {
  id: string;
  contract_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number; // 1-5
  comment: string;
}
