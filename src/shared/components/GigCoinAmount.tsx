import { GIGCOIN_LOGO_SRC, formatGigCoinNumber } from '../utils/gigcoin';

interface GigCoinLogoProps { readonly className?: string; readonly size?: number; }
interface GigCoinAmountProps { readonly amount: number | null | undefined; readonly className?: string; readonly iconClassName?: string; readonly prefix?: string; readonly suffix?: string; readonly showLabel?: boolean; }
interface GigCoinBudgetProps { readonly min?: number | null; readonly max?: number | null; readonly className?: string; }

export function GigCoinLogo({ className = '', size = 16 }: GigCoinLogoProps) {
  return <img src={GIGCOIN_LOGO_SRC} alt="GigCoin" className={className} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
}

export function GigCoinAmount({ amount, className = '', iconClassName = '', prefix = '', suffix = '', showLabel = false }: GigCoinAmountProps) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      {prefix && <span>{prefix}</span>}
      <GigCoinLogo className={iconClassName} size={16} />
      <span>{formatGigCoinNumber(amount)}</span>
      {showLabel && <span className="sr-only">GigCoin</span>}
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

export function GigCoinBudget({ min, max, className = '' }: GigCoinBudgetProps) {
  if (min !== undefined && min !== null && max !== undefined && max !== null) return <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}><GigCoinAmount amount={min} /><span>-</span><GigCoinAmount amount={max} /></span>;
  if (min !== undefined && min !== null) return <GigCoinAmount amount={min} prefix="From" className={className} />;
  if (max !== undefined && max !== null) return <GigCoinAmount amount={max} prefix="Up to" className={className} />;
  return <span className={className}>Not set</span>;
}
