export const GIGCOIN_CURRENCY_CODE = 'GIG';
export const GIGCOIN_UNIT_LABEL = 'G-coin';
export const GIGCOIN_LOGO_SRC = '/icons/G-coin.png';

export const GIGCOIN_INLINE_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="#F7B731"/>
  <circle cx="32" cy="32" r="24" fill="#FFD86B" stroke="#8A5A00" stroke-width="4"/>
  <path d="M39.5 21.8C37.7 20.7 35.5 20 32.8 20C25.8 20 21 24.8 21 32C21 39.2 25.8 44 33.2 44C36.6 44 39.7 43 42 41.1V31H32.7V36.2H36.3V38C35.6 38.3 34.6 38.5 33.4 38.5C29.6 38.5 27.2 35.9 27.2 32C27.2 28 29.7 25.5 33.1 25.5C34.8 25.5 36.2 25.9 37.6 26.8L39.5 21.8Z" fill="#2A1A00"/>
</svg>`;

export function formatGigCoinNumber(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

export function formatGigCoin(amount: number | null | undefined): string {
  return `${formatGigCoinNumber(amount)} ${GIGCOIN_UNIT_LABEL}`;
}

export function formatGigCoinRange(min?: number | null, max?: number | null): string {
  if (min !== undefined && min !== null && max !== undefined && max !== null) return `${formatGigCoinNumber(min)}-${formatGigCoinNumber(max)} ${GIGCOIN_UNIT_LABEL}`;
  if (min !== undefined && min !== null) return `From ${formatGigCoin(min)}`;
  if (max !== undefined && max !== null) return `Up to ${formatGigCoin(max)}`;
  return 'Not set';
}
