import type { ContractDto } from '../../types/models/Contract';
import { ContractStatus } from '../../types/models/Contract';

export interface ContractWorkflowRoute {
  path?: string;
  waitMessage?: string;
}

export function getContractWorkflowRoute(
  contract: ContractDto,
  isClient: boolean,
): ContractWorkflowRoute {
  const contractPath = `/contracts/${contract.contractsId}`;

  switch (contract.status) {
    case ContractStatus.PendingContractDetails:
      return isClient
        ? { path: `${contractPath}/milestones?mode=contract-edit` }
        : { waitMessage: 'The client is updating milestone terms. You can review them once submitted.' };
    case ContractStatus.PendingContractConfirmation:
      // Both parties must be able to inspect the draft. The contract screen itself
      // keeps client actions read-only while the freelancer reviews the terms.
      return { path: contractPath };
    case ContractStatus.PendingSignature:
      return { path: contractPath };
    case ContractStatus.PendingEscrow:
      return isClient
        ? { path: contractPath }
        : { path: `/workspace/${contract.contractsId}` };
    case ContractStatus.Active:
      return { path: `/workspace/${contract.contractsId}` };
    default:
      return { path: contractPath };
  }
}
