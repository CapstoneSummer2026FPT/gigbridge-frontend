import { GIGCOIN_LOGO_SRC, formatGigCoinNumber, formatGigCoinToVnd, formatGigCoinRangeToVnd } from '../utils/gigcoin';

interface GigCoinLogoProps { readonly className?: string; readonly size?: number; }
interface GigCoinAmountProps {
  readonly amount: number | null | undefined;
  readonly className?: string;
  readonly iconClassName?: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly showLabel?: boolean;
  readonly showVndEquivalent?: boolean;
  readonly vndClassName?: string;
}
interface GigCoinBudgetProps {
  readonly min?: number | null;
  readonly max?: number | null;
  readonly className?: string;
  readonly showVndEquivalent?: boolean;
  readonly vndClassName?: string;
}

export function GigCoinLogo({ className = '', size = 16 }: GigCoinLogoProps) {
  return <img src={GIGCOIN_LOGO_SRC} alt="GigCoin" className={className} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
}

export function GigCoinAmount({
  amount, className = '', iconClassName = '', prefix = '', suffix = '', showLabel = false, showVndEquivalent = false, vndClassName = 'text-xs font-normal text-muted-foreground'
}: GigCoinAmountProps) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 whitespace-nowrap ${className}`}>
      <span className="inline-flex items-center gap-1">
        {prefix && <span>{prefix}</span>}
        <GigCoinLogo className={iconClassName} size={16} />
        <span>{formatGigCoinNumber(amount)}</span>
        {showLabel && <span className="sr-only">GigCoin</span>}
        {suffix && <span>{suffix}</span>}
      </span>
      {showVndEquivalent && (
        <span className={vndClassName}>
          (≈ {formatGigCoinToVnd(amount)})
        </span>
      )}
    </span>
  );
}

export function GigCoinBudget({ min, max, className = '', showVndEquivalent = false, vndClassName = 'text-xs font-normal text-muted-foreground' }: GigCoinBudgetProps) {
  if (min !== undefined && min !== null && max !== undefined && max !== null) {
    if (min === max) {
      return <GigCoinAmount amount={min} className={className} showVndEquivalent={showVndEquivalent} vndClassName={vndClassName} />;
    }
    return (
      <span className={`inline-flex flex-wrap items-center gap-1.5 whitespace-nowrap ${className}`}>
        <span className="inline-flex items-center gap-1">
          <GigCoinAmount amount={min} />
          <span>-</span>
          <GigCoinAmount amount={max} />
        </span>
        {showVndEquivalent && (
          <span className={vndClassName}>
            (≈ {formatGigCoinRangeToVnd(min, max)})
          </span>
        )}
      </span>
    );
  }
  if (min !== undefined && min !== null) return <GigCoinAmount amount={min} prefix="From" className={className} showVndEquivalent={showVndEquivalent} vndClassName={vndClassName} />;
  if (max !== undefined && max !== null) return <GigCoinAmount amount={max} prefix="Up to" className={className} showVndEquivalent={showVndEquivalent} vndClassName={vndClassName} />;
  return <span className={className}>Not set</span>;
}
