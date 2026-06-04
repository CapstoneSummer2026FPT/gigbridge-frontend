export interface BillingEarningsConfig {
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  billingAddress: string;
  companyTaxId: string;
  vatInvoiceEnabled: boolean;
}

export const BILLING_SETTINGS_STORAGE_KEY = 'gb_billing_earnings_config';

export const DEFAULT_BILLING_EARNINGS_CONFIG: BillingEarningsConfig = {
  bankName: 'Vietcombank',
  bankAccountName: 'GIGBRIDGE CLIENT COMPANY LTD',
  bankAccountNumber: '102889009991',
  billingAddress: '12 Nguyen Hue Street, District 1, Ho Chi Minh City',
  companyTaxId: '0312345678',
  vatInvoiceEnabled: true,
};

export function getStoredBillingConfig(): BillingEarningsConfig {
  try {
    const stored = localStorage.getItem(BILLING_SETTINGS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_error) {
    localStorage.removeItem(BILLING_SETTINGS_STORAGE_KEY);
  }
  return DEFAULT_BILLING_EARNINGS_CONFIG;
}

export function saveStoredBillingConfig(config: BillingEarningsConfig) {
  localStorage.setItem(BILLING_SETTINGS_STORAGE_KEY, JSON.stringify(config));
}
