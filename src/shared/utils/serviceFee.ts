export const SERVICE_FEE_RATE = 0.01;

export function calculateServiceFee(jobAmount: number): number {
  return Math.round(jobAmount * SERVICE_FEE_RATE * 10_000) / 10_000;
}

export function isInsufficientServiceFeeError(message?: string | null): boolean {
  return message?.toLowerCase().includes('insufficient gigcoin') ?? false;
}
