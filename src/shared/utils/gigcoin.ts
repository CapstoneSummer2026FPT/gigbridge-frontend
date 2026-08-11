export const GIGCOIN_CURRENCY_CODE = 'GIG';
const GIGCOIN_UNIT_LABEL = 'G-coin';
export const GIGCOIN_LOGO_SRC = '/icons/G-coin.png';
export const GIGCOIN_VND_EXCHANGE_RATE = 1000;

export function formatGigCoinNumber(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

export function formatGigCoin(amount: number | null | undefined): string {
  return `${formatGigCoinNumber(amount)} ${GIGCOIN_UNIT_LABEL}`;
}

export function formatGigCoinPrecise(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
  return `${formatted} ${GIGCOIN_UNIT_LABEL}`;
}

export function formatGigCoinRange(min?: number | null, max?: number | null): string {
  const minVal = typeof min === 'number' && Number.isFinite(min) && min > 0 ? min : null;
  const maxVal = typeof max === 'number' && Number.isFinite(max) && max > 0 ? max : null;

  if (minVal !== null && maxVal !== null) {
    if (minVal === maxVal) {
      return `${formatGigCoinNumber(minVal)} ${GIGCOIN_UNIT_LABEL}`;
    }
    return `${formatGigCoinNumber(minVal)} - ${formatGigCoinNumber(maxVal)} ${GIGCOIN_UNIT_LABEL}`;
  }

  if (minVal !== null) {
    return `${formatGigCoinNumber(minVal)} ${GIGCOIN_UNIT_LABEL}`;
  }

  if (maxVal !== null) {
    return `${formatGigCoinNumber(maxVal)} ${GIGCOIN_UNIT_LABEL}`;
  }

  return 'Thương lượng';
}

export function formatVndNumber(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function formatGigCoinToVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount <= 0) {
    return '0 VNĐ';
  }
  const vndValue = amount * GIGCOIN_VND_EXCHANGE_RATE;
  return `${formatVndNumber(vndValue)} VNĐ`;
}

export function formatGigCoinRangeToVnd(min?: number | null, max?: number | null): string {
  const minVal = typeof min === 'number' && Number.isFinite(min) && min > 0 ? min : null;
  const maxVal = typeof max === 'number' && Number.isFinite(max) && max > 0 ? max : null;

  if (minVal !== null && maxVal !== null) {
    if (minVal === maxVal) {
      return formatGigCoinToVnd(minVal);
    }
    return `${formatVndNumber(minVal * GIGCOIN_VND_EXCHANGE_RATE)} - ${formatVndNumber(maxVal * GIGCOIN_VND_EXCHANGE_RATE)} VNĐ`;
  }

  if (minVal !== null) return formatGigCoinToVnd(minVal);
  if (maxVal !== null) return formatGigCoinToVnd(maxVal);

  return '0 VNĐ';
}
