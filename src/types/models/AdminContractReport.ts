import type { PageResult } from './AdminPhase1';

export enum ContractReportAdminStatus { Open = 0, UnderReview = 1, AwaitingInformation = 2, Closed = 3, Dismissed = 4, Escalated = 5, LinkedToDispute = 6 }
export enum ContractReportInformationTarget { Reporter = 0, Respondent = 1, Both = 2 }
export enum ContractReportAdminResolutionAction { ResolvedByParties = 0, NoFurtherActionRequired = 1, Other = 2 }
export interface AdminContractReportListItem { reportContractId:string; contractId:string; contractTitle:string; jobPostId:string; jobPostTitle:string; reporterId:string; reporterName:string; reporterRole:string; respondentId?:string; respondentName?:string; respondentRole?:string; milestoneId?:string; milestoneTitle?:string; issueType:number; status:number; adminReviewStatus:number; createdAt:string; updatedAt?:string; resolutionAction?:number; attachmentCount:number; assignedAdminId?:string; assignedAdminName?:string; relatedDisputeId?:string; disputeStatus?:number; escalationEligible:boolean }
export interface AdminContractReportParty { userId:string; name:string; email:string; role:string; accountStatus:number; violationCount:number; isFlagged:boolean }
export interface AdminContractReportAttachment { attachmentId:string; fileName:string; contentType:string; fileSize:number; uploadedAt:string; uploadedByUserId?:string; uploadedByName?:string; copiedToDispute:boolean }
export interface AdminContractReportNote { noteId:string; adminUserId:string; adminName:string; content:string; createdAt:string; updatedAt?:string }
export interface AdminContractInformationRequest { informationRequestId:string; requestId:string; targetUserId:string; targetName:string; message:string; requestedEvidenceOrClarification?:string; dueAt?:string; status:number; createdAt:string; respondedAt?:string }
export interface AdminContractReportLedger { transactionId:string; milestoneId?:string; amount:number; type:number; status:number; createdAt:string }
export interface AdminContractReportMessage { messageId:string; conversationId:string; senderUserId?:string; senderName?:string; messageType:number; content?:string; sentAt:string }
export interface AdminContractReportAudit { auditId:string; adminId:string; adminName?:string; action:string; oldValues?:string; newValues?:string; correlationId:string; createdAt:string }
export interface AdminContractReportDetail {
  reportContractId:string; issueType:number; description:string; desiredResolution:string; status:number; adminReviewStatus:number; createdAt:string; updatedAt?:string;
  resolutionAction?:number; adminResolutionAction?:number; adminResolutionNote?:string; assignedAdminId?:string; assignedAdminName?:string; assignedAt?:string; relatedDisputeId?:string; relatedDisputeStatus?:number;
  reporter:AdminContractReportParty; respondent?:AdminContractReportParty; client:AdminContractReportParty; freelancer?:AdminContractReportParty;
  contractId:string; contractTitle:string; contractStatus:number; contractBudget:number; startDate?:string; endDate?:string; jobPostId:string; jobPostTitle:string; proposalId?:string; contractLocked:boolean; contractReportCount:number; disputeCount:number;
  milestone?:{milestoneId:string;title:string;amount:number;status:number;submittedAt?:string;approvedAt?:string;releasedAmount:number;refundAmount:number;penaltyAmount:number}; attachments:AdminContractReportAttachment[];
  explanation?:string; proposedResolution?:string; rejectReason?:string; respondedAt?:string; resolvedAt?:string;
  escrowRequired:number; escrowFunded:number; escrowReleased:number; escrowRemaining:number; escrowTransactions:AdminContractReportLedger[]; walletTransactions:AdminContractReportLedger[];
  messages:AdminContractReportMessage[]; internalNotes:AdminContractReportNote[]; informationRequests:AdminContractInformationRequest[]; auditHistory:AdminContractReportAudit[];
  canAssign:boolean; canRequestInformation:boolean; canClose:boolean; canDismiss:boolean; canEscalate:boolean; canLinkDispute:boolean;
}
export interface AdminContractReportListParams { search?:string; status?:number; adminReviewStatus?:number; issueType?:number; reporterId?:string; respondentId?:string; clientId?:string; freelancerId?:string; contractId?:string; jobPostId?:string; milestoneId?:string; createdFrom?:string; createdTo?:string; updatedFrom?:string; updatedTo?:string; hasAttachments?:boolean; hasResponse?:boolean; assignedAdminId?:string; unassignedOnly?:boolean; hasRelatedDispute?:boolean; escalated?:boolean; sortBy?:string; sortDescending?:boolean; page?:number; pageSize?:number }
export type AdminContractReportPage = PageResult<AdminContractReportListItem>;
