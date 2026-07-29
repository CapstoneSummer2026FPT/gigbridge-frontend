import { describe, expect, it } from 'vitest';
import type { ContractDto } from '../../types/models/Contract';
import { ContractStatus } from '../../types/models/Contract';
import { getContractWorkflowRoute } from './contractWorkflowRoute';

function contract(status: ContractStatus): ContractDto {
  return {
    contractsId: 'contract-1',
    status,
  } as ContractDto;
}

describe('getContractWorkflowRoute', () => {
  it('lets the client open a draft while the freelancer reviews it', () => {
    expect(
      getContractWorkflowRoute(contract(ContractStatus.PendingContractConfirmation), true),
    ).toEqual({ path: '/contracts/contract-1' });
  });

  it('keeps the freelancer waiting while the client edits contract details', () => {
    expect(
      getContractWorkflowRoute(contract(ContractStatus.PendingContractDetails), false),
    ).toEqual({
      waitMessage: 'The client is updating milestone terms. You can review them once submitted.',
    });
  });

  it('routes active contracts to the workspace for both parties', () => {
    expect(getContractWorkflowRoute(contract(ContractStatus.Active), true)).toEqual({
      path: '/workspace/contract-1',
    });
    expect(getContractWorkflowRoute(contract(ContractStatus.Active), false)).toEqual({
      path: '/workspace/contract-1',
    });
  });
});
