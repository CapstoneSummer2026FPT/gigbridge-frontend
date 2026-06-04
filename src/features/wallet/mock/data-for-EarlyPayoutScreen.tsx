export interface EarlyPayoutAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export const MOCK_EARLY_PAYOUT = {
  availableBalanceVnd: 84500000,
  standardHoldingDays: '3-5 business days',
  instantTransferTime: 'within 5 minutes',
  feeRate: 0.015,
  minAmountVnd: 100000,
  defaultAccount: {
    bankName: 'Vietcombank',
    accountName: 'NGUYEN VAN FREELANCER',
    accountNumber: '102889004412',
  } satisfies EarlyPayoutAccount,
};
