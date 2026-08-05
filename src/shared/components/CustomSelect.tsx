import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  leftIcon?: React.ReactNode;
  ariaLabel?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder,
  className = '',
  leftIcon,
  ariaLabel,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-left font-['Plus_Jakarta_Sans',sans-serif] ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen(prev => !prev)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3.5 text-xs font-extrabold text-text-primary shadow-sm transition-all hover:border-brand/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {leftIcon && <span className="shrink-0 text-text-muted">{leftIcon}</span>}
          <span className="truncate">{selectedOption?.label || placeholder || 'Select option'}</span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-text-muted transition-transform duration-200 ${open ? 'rotate-180 text-brand' : ''}`}
        />
      </button>

      {/* Floating Styled Dropdown Menu */}
      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 min-w-[160px] overflow-hidden rounded-2xl border border-border bg-background p-1.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in-50 zoom-in-95"
          style={{
            boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.15), 0 4px 12px -2px rgba(73, 75, 231, 0.08)',
          }}
        >
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {options.map(option => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand/10 text-brand font-black'
                      : 'text-text-primary hover:bg-surface-muted hover:text-brand'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {isSelected && <Check size={14} className="shrink-0 text-brand font-black" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
