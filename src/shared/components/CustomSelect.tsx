import { useEffect, useRef, useState, useMemo, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import './styles/custom-select.css';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
  subLabel?: string;
}

export interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  className?: string;
  leftIcon?: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  emptyMessage?: string;
  popoverAlign?: 'left' | 'right';
  variant?: 'default' | 'compact' | 'pill';
  popoverMinWidth?: number;
}

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  searchable = true,
  className = '',
  leftIcon,
  ariaLabel,
  disabled = false,
  emptyMessage = 'No options found.',
  popoverAlign = 'left',
  variant = 'default',
  popoverMinWidth,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 220,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find(opt => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(query) ||
        (opt.badge && opt.badge.toLowerCase().includes(query)) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(query))
    );
  }, [options, searchable, searchQuery]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const isRight = popoverAlign === 'right';
    const isCompact = variant === 'compact' || className.includes('cs-compact') || (!searchable && options.length <= 5);
    
    const estimatedHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldFlip = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    const top = shouldFlip ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6;
    const defaultMinWidth = isCompact ? Math.max(rect.width, 96) : 220;
    const width = Math.max(rect.width, popoverMinWidth ?? defaultMinWidth);

    let left: number;
    if (isRight || isCompact) {
      const idealLeft = rect.right - width;
      if (idealLeft >= 8) {
        left = Math.min(idealLeft, window.innerWidth - width - 8);
      } else {
        left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      }
    } else {
      left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    }

    setCoords({
      top,
      left,
      width,
    });
  }, [popoverAlign, variant, className, searchable, options.length, popoverMinWidth]);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 50);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const variantClass = variant === 'compact' ? 'cs-compact' : variant === 'pill' ? 'cs-pill' : '';

  return (
    <div ref={containerRef} className={`cs-container ${variantClass} ${open ? 'is-open' : ''} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className={`cs-trigger ${open ? 'is-open' : ''}`}
      >
        {leftIcon && <span className="cs-trigger-icon">{leftIcon}</span>}

        <div className="cs-trigger-content">
          {selectedOption ? (
            <div className="flex items-center gap-2 min-w-0 truncate">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.badge && <span className="cs-badge">{selectedOption.badge}</span>}
            </div>
          ) : (
            <span className="text-[var(--gb-text-muted,var(--text-muted,#95959f))]">{placeholder}</span>
          )}
        </div>

        <ChevronDown size={16} className={`cs-arrow ${open ? 'is-open' : ''}`} />
      </button>

      {/* Popover Menu via Portal to body (immune to any parent overflow/clipping issues) */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className={`cs-popover is-portal ${className.includes('cs-compact') || variant === 'compact' ? 'cs-popover-compact' : ''}`}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              minWidth: `${coords.width}px`,
              maxWidth: 'calc(100vw - 16px)',
              zIndex: 99999,
            }}
          >
            {searchable && (
              <div className="cs-search-box">
                <Search size={14} className="cs-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="cs-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="cs-search-clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Options Scroll List */}
            <div className="cs-options-list custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(option => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className={`cs-option-item ${isSelected ? 'is-selected' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        {option.icon && <span className="shrink-0">{option.icon}</span>}
                        <span className="truncate">{option.label}</span>
                        {option.badge && <span className="cs-badge">{option.badge}</span>}
                      </div>

                      {isSelected && <Check size={14} className="shrink-0 text-[var(--brand,#494be7)]" />}
                    </button>
                  );
                })
              ) : (
                <div className="cs-empty">{emptyMessage}</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default CustomSelect;
