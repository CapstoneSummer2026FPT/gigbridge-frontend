/**
 * Financial Models - WALLETS, SUBSCRIPTIONS, TRANSACTIONS tables
 */

export interface Wallet {
  wal_WalletsId: string;
  usr_UserId: string;
  Balance: number;
  Currency: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export enum SubscriptionType {
  Free = 'Free',
  Pro = 'Pro',
}

export enum SubscriptionDuration {
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export enum SubscriptionStatus {
  Active = 'active',
  Expired = 'expired',
  Cancelled = 'cancelled',
  Pending = 'pending',
}

export interface Subscription {
  SubscriptionId: string;
  Type: SubscriptionType;
  Amount: number;
  Duration: SubscriptionDuration;
  Status: SubscriptionStatus;
  Description: string;
  CreatedAt: string;
  CompletedAt?: string;
}

export enum TransactionType {
  Deposit = 'deposit',
  Withdrawal = 'withdrawal',
  Subscription = 'subscription',
  Refund = 'refund',
}

export enum TransactionStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export interface Transaction {
  trans_TransactionsId: string;
  wal_WalletsId: string;
  SubscriptionId?: string;
  Type: TransactionType;
  Amount: number;
  Currency: string;
  Status: TransactionStatus;
  Description: string;
  CreatedAt: string;
  CompletedAt?: string;
}

/**
 * Which wallet pool a transaction touched. Mirrors the backend
 * `WalletBalanceSource` enum (0-5).
 */
export enum WalletBalanceSource {
  Deposited = 0,
  Earned = 1,
  HeldDeposited = 2,
  HeldEarned = 3,
  PendingWithdrawal = 4,
  Combined = 5,
}

/**
 * Wallet balances with explicit, unambiguous names. The wallet has two independent
 * spendable pools:
 * - `depositedGigCoin` — purchased/deposited, spendable but NOT withdrawable.
 * - `withdrawableGigCoin` — earned from completed work, spendable AND withdrawable.
 *
 * `totalSpendableGigCoin` is the sum of both spendable pools and must never be treated
 * as a withdrawal maximum — withdrawals may only use `withdrawableGigCoin`.
 */
export interface WalletResponse {
  walletId: string;
  userId: string;
  depositedGigCoin: number;
  withdrawableGigCoin: number;
  heldGigCoin: number;
  pendingWithdrawalGigCoin: number;
  totalSpendableGigCoin: number;
  depositedGigCoinVnd: number;
  withdrawableGigCoinVnd: number;
  heldGigCoinVnd: number;
  pendingWithdrawalGigCoinVnd: number;
  totalSpendableGigCoinVnd: number;
}

export interface WalletTransactionResponse {
  walletTransactionId: string;
  walletId: string;
  userId: string;
  tokenAmount: number;
  vndAmount: number;
  type: number;
  status: number;
  balanceSource: WalletBalanceSource;
  /** True when this row is money arriving for this wallet's owner (render as +/green). */
  isCredit: boolean;
  /** Amount sourced from the deposited pool; null when single-source Earned. */
  depositedAmount?: number | null;
  /** Amount sourced from the earned pool; null when single-source Deposited. */
  earnedAmount?: number | null;
  idempotencyKey?: string | null;
  gatewayProvider?: string | null;
  gatewayOrderCode?: string | null;
  gatewayTransactionCode?: string | null;
  contractId?: string | null;
  contractEscrowId?: string | null;
  note?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface CreateWalletTopUpRequest {
  tokenAmount: number;
  returnUrl?: string;
  cancelUrl?: string;
  idempotencyKey?: string;
}

/**
 * Figures shared by every role. Lifetime aggregates cover the account's entire
 * history, unlike the 100-item transaction list.
 */
interface WalletSummaryBase {
  totalTopUps: number;
  /** A count of transactions still pending, not an amount. */
  pendingTransactionCount: number;
  /** Every ledger row, failed and cancelled included, matching the list below the cards. */
  totalTransactions: number;
}

/** Only a client ever funds escrow, and a client can never withdraw. */
export interface ClientWalletSummary {
  /** Lifetime gross funded into escrow; only ever grows. */
  totalEscrowFunded: number;
  /** Live wallet pool: what is in escrow right now, falling on release and refund. */
  currentEscrowHeld: number;
  totalReleasedToFreelancers: number;
  totalEscrowRefunds: number;
}

/**
 * `totalEarnedFromEscrow` and `totalWithdrawnToBank` describe the SAME coins at two
 * stages of their life — earned into the wallet, then cashed out of it. Never sum them:
 * that reported a freelancer who earned and withdrew 1,000,000 as having moved 2,000,000.
 */
export interface FreelancerWalletSummary {
  totalEarnedFromEscrow: number;
  /** Succeeded bank payouts only. */
  totalWithdrawnToBank: number;
  /** Live wallet pool: an amount locked in an in-flight payout. */
  currentPendingWithdrawal: number;
  /** Net of service-fee refunds issued when a contract is cancelled. */
  totalServiceFeesPaid: number;
}

/**
 * Role-shaped wallet stat-card figures driving /wallet/history. A client and a freelancer
 * sit on opposite sides of every escrow movement, so `role` selects which branch exists —
 * reading the wrong one is a compile error rather than a card that is always zero.
 */
export type WalletTransactionsSummaryResponse =
  | (WalletSummaryBase & { role: 'Client'; client: ClientWalletSummary; freelancer?: null })
  | (WalletSummaryBase & { role: 'Freelancer'; freelancer: FreelancerWalletSummary; client?: null })
  | (WalletSummaryBase & { role: 'Generic'; client?: null; freelancer?: null });

export interface CreateWalletTopUpResponse {
  walletTransactionId: string;
  tokenAmount: number;
  amountVnd: number;
  gatewayProvider: string;
  gatewayOrderCode: string;
  gatewayTransactionCode?: string | null;
  checkoutUrl?: string | null;
  status: number;
}

export interface SyncPayOsTopUpRequest {
  orderCode: number;
}

export enum WithdrawalStatus {
  Pending = 0,
  Processing = 1,
  SyncRequired = 2,
  Success = 3,
  Failed = 4,
  Cancelled = 5,
}

export enum BankAccountStatus {
  Active = 0,
  Disabled = 1,
}

export interface BankAccountResponse {
  bankAccountId: string;
  userId: string;
  bankBin?: string | null;
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountName: string;
  status: BankAccountStatus;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface WithdrawalResponse {
  withdrawalId: string;
  userId: string;
  walletId: string;
  bankAccountId?: string | null;
  bankBin?: string | null;
  bankCode: string;
  bankName: string;
  bankAccountNumberMasked: string;
  bankAccountName: string;
  tokenAmount: number;
  vndAmount: number;
  feeVnd: number;
  netVndAmount: number;
  status: WithdrawalStatus;
  provider: string;
  providerOrderCode: string;
  providerPayoutId?: string | null;
  providerTransactionCode?: string | null;
  providerRawStatus?: string | null;
  failureReason?: string | null;
  lastSyncError?: string | null;
  createdAt: string;
  processingStartedAt?: string | null;
  lastSyncedAt?: string | null;
  completedAt?: string | null;
  canRetry: boolean;
}

export interface WithdrawalSettingsResponse {
  enabled: boolean;
  vndPerToken: number;
  fixedFeeVnd: number;
  minTokens: number;
  maxTokens: number;
  dailyMaxTokens: number;
  provider: string;
}

export interface SupportedBankResponse {
  bin: string;
  code: string;
  shortName: string;
  name: string;
  logo?: string | null;
}

export interface CreateBankAccountRequest {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  isDefault?: boolean;
  /** Deprecated compatibility fields. The backend resolves bank identity from bankBin. */
  bankCode?: string;
  bankName?: string;
}

export interface UpdateBankAccountRequest {
  bankBin?: string;
  /** Deprecated compatibility fields. The backend resolves bank identity from bankBin. */
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  isDefault?: boolean;
}

export interface CreateWithdrawalRequest {
  tokenAmount: number;
  bankAccountId?: string | null;
  idempotencyKey: string;
}

export type FinancialOverviewPeriod = 'day' | 'month' | 'year';
export type FinancialOverviewRole = 'Client' | 'Freelancer';
export type FinancialTransactionCategory = 'escrow' | 'released' | 'refund' | 'serviceFee';

export interface FinancialTrendPoint {
  period: string;
  periodStartUtc: string;
  paidOrReceivedAmount: number;
  escrowFundedAmount: number;
  serviceFeeAmount: number;
}

export interface FinancialTransactionItem {
  walletTransactionId: string;
  contractId: string;
  project: string;
  category: FinancialTransactionCategory;
  amount: number;
  signedAmount: number;
  occurredAt: string;
}

export interface FinancialOverviewResponse {
  role: FinancialOverviewRole;
  period: FinancialOverviewPeriod;
  periodStartUtc: string;
  periodEndUtc: string;
  totalAmount: number;
  averageAmount: number;
  progressAmount: number;
  totalContractValue: number;
  progressPercentage: number;
  totalServiceFeePaid: number;
  averageDivisorJobCount: number;
  trendPoints: FinancialTrendPoint[];
  recentTransactions: FinancialTransactionItem[];
}
