import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ContractAmendmentDetailDto, ContractAmendmentMilestoneDto, ContractChangeRequestDto } from '../../types/models/Contract';

export const contractAmendmentAPI = {
  getChangeRequests: (contractId: string): Promise<ApiResponse<ContractChangeRequestDto[]>> =>
    apiService.get<ContractChangeRequestDto[]>(`Contracts/${contractId}/change-requests`),
  createChangeRequest: (contractId: string, payload: { reason: string; requestedChanges: string; affectedMilestoneIds: string[]; affectedWorkItemIds: string[] }): Promise<ApiResponse<string>> =>
    apiService.post<string>(`Contracts/${contractId}/change-requests`, payload),
  respondChangeRequest: (contractId: string, requestId: string, payload: { accept: boolean; needsClarification: boolean; note?: string }): Promise<ApiResponse<boolean>> =>
    apiService.post<boolean>(`Contracts/${contractId}/change-requests/${requestId}/respond`, payload),
  getAmendments: (contractId: string): Promise<ApiResponse<ContractAmendmentDetailDto[]>> =>
    apiService.get<ContractAmendmentDetailDto[]>(`Contracts/${contractId}/amendments`),
  createAmendment: (contractId: string, payload: { changeRequestId: string; reason: string; milestones: ContractAmendmentMilestoneDto[] }): Promise<ApiResponse<string>> =>
    apiService.post<string>(`Contracts/${contractId}/amendments`, toRequest(payload)),
  updateAmendment: (contractId: string, amendmentId: string, payload: { changeRequestId: string; reason: string; milestones: ContractAmendmentMilestoneDto[] }): Promise<ApiResponse<boolean>> =>
    apiService.put<boolean>(`Contracts/${contractId}/amendments/${amendmentId}`, toRequest(payload)),
  respondAmendment: (contractId: string, amendmentId: string, payload: { accept: boolean; requestChanges: boolean; note?: string }): Promise<ApiResponse<boolean>> =>
    apiService.post<boolean>(`Contracts/${contractId}/amendments/${amendmentId}/respond`, payload),
  signAmendment: (contractId: string, amendmentId: string, signatureData: string): Promise<ApiResponse<boolean>> =>
    apiService.post<boolean>(`Contracts/${contractId}/amendments/${amendmentId}/sign`, { signatureData }),
  fundAmendment: (contractId: string, amendmentId: string): Promise<ApiResponse<boolean>> =>
    apiService.post<boolean>(`Contracts/${contractId}/amendments/${amendmentId}/fund`),
};

const toRequest = (payload: { changeRequestId: string; reason: string; milestones: ContractAmendmentMilestoneDto[] }) => ({
  changeRequestId: payload.changeRequestId,
  reason: payload.reason,
  milestones: payload.milestones.map(item => ({
    milestoneId: item.sourceMilestoneId,
    title: item.title,
    description: item.description,
    amount: item.amount,
    estimatedDuration: item.estimatedDuration,
    dueDate: item.dueDate,
    deliverables: item.deliverables,
    acceptanceCriteria: item.acceptanceCriteria,
    sortOrder: item.orderIndex,
    workItems: item.workItems.map(workItem => ({
      workItemId: workItem.sourceWorkItemId,
      title: workItem.title,
      description: workItem.description,
      deliverables: workItem.deliverables,
      estimatedDuration: workItem.estimatedDuration,
      orderIndex: workItem.orderIndex,
    })),
  })),
});
