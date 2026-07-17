export enum ContractReportIssueType {
  PaymentIssue = 0,
  MilestoneIssue = 1,
  Delay = 2,
  PoorQuality = 3,
  CommunicationProblem = 4,
  ScopeChange = 5,
  Other = 6,
}

export enum ContractReportStatus {
  Pending = 0,
  WaitingReporterConfirmation = 1,
  Resolved = 2,
  Escalated = 3,
}

export enum ContractReportResolutionAction {
  AcceptIssue = 0,
  ProvideExplanation = 1,
  ProposeResolution = 2,
  RejectIssue = 3,
}

export interface ReportContractAttachment {
  reportContractAttachmentId: string;
  fileUrl: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ReportContractInitiator {
  id: string;
  name: string | null;
  role: 'Client' | 'Freelancer' | null;
}

export interface ReportContractRespondent {
  id: string;
  name: string | null;
  role: string | null;
}

export interface ReportContractMilestone {
  id: string;
  title: string | null;
}

export interface ReportContract {
  id: string;
  contractId: string;
  reporter: ReportContractInitiator;
  respondent: ReportContractRespondent | null;
  milestone: ReportContractMilestone | null;
  issueType: ContractReportIssueType;
  description: string;
  desiredResolution: string;
  status: ContractReportStatus;
  resolutionAction: ContractReportResolutionAction | null;
  explanation: string | null;
  proposedResolution: string | null;
  rejectReason: string | null;
  resolvedBy: string | null;
  createdAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
  isEscalatedToDispute: boolean;
  attachments: ReportContractAttachment[];
}

export interface ReportContractListItem {
  id: string;
  reporterId: string;
  reporterName: string | null;
  reporterRole: string | null;
  issueType: ContractReportIssueType;
  status: ContractReportStatus;
  resolutionAction: ContractReportResolutionAction | null;
  createdAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
}

export interface CreateReportInput {
  contractId: string;
  issueType: ContractReportIssueType;
  description: string;
  desiredResolution: string;
  milestoneId?: string | null;
  attachments?: File[];
}

export interface RespondToReportInput {
  resolutionAction: ContractReportResolutionAction;
  explanation?: string | null;
  proposedResolution?: string | null;
  rejectReason?: string | null;
}

export interface ConfirmResolutionInput {
  isAccepted: boolean;
}
