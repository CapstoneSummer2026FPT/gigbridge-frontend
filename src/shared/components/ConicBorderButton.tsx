import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './styles/conic-border-button.css';

export interface ConicBorderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'brand-mint' | 'emerald' | 'purple';
  isActive?: boolean;
  wrapperClassName?: string;
}

export function ConicBorderButton({
  children,
  variant = 'brand-mint',
  isActive = false,
  wrapperClassName = '',
  className = '',
  disabled,
  onClick,
  type = 'button',
  ...props
}: ConicBorderButtonProps) {
  const variantClass = variant !== 'brand-mint' ? `variant-${variant}` : '';

  return (
    <div className={`conic-border-wrap ${variantClass} ${wrapperClassName}`}>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`conic-border-btn ${isActive ? 'is-active' : ''} ${className}`}
        {...props}
      >
        {children}
      </button>
    </div>
  );
}
