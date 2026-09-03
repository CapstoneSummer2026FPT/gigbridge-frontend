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
  zIndex?: number;
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
  zIndex,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    isFlipped: boolean;
  }>({
    top: 0,
    left: 0,
    width: 220,
    isFlipped: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isInsideModal = Boolean(containerRef.current?.closest('[role="dialog"], .modal-backdrop, .modal-card, [data-modal]'));
  const effectiveZIndex = zIndex ?? (isInsideModal ? 99999 : 40);

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
    
    // Accurately calculate popover height (or estimate based on actual content)
    const measuredHeight = popoverRef.current?.offsetHeight;
    const estimatedHeight = measuredHeight && measuredHeight > 0
      ? measuredHeight
      : Math.min(280, filteredOptions.length * 42 + (searchable ? 48 : 0) + 16);

    const TOP_NAV_HEIGHT = 76;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top - TOP_NAV_HEIGHT;
    const shouldFlip = spaceBelow < estimatedHeight && spaceAbove >= estimatedHeight;

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

    if (shouldFlip) {
      setCoords({
        bottom: Math.max(8, window.innerHeight - rect.top + 6),
        top: undefined,
        left,
        width,
        isFlipped: true,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        bottom: undefined,
        left,
        width,
        isFlipped: false,
      });
    }
  }, [popoverAlign, variant, className, searchable, options.length, filteredOptions.length, popoverMinWidth]);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleScrollOrResize = (e: Event) => {
      // Ignore scroll events originating from inside the popover itself (e.g. scrolling options list)
      if (popoverRef.current && e.target && popoverRef.current.contains(e.target as Node)) {
        return;
      }

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Auto-close if trigger has scrolled under sticky TopNav or off-screen
        if (rect.top < 76 || rect.bottom < 0 || rect.top > window.innerHeight) {
          setOpen(false);
          return;
        }
      }

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
            className={`cs-popover is-portal ${coords.isFlipped ? 'is-flipped' : ''} ${className.includes('cs-compact') || variant === 'compact' ? 'cs-popover-compact' : ''}`}
            style={{
              position: 'fixed',
              ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
              ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              minWidth: `${coords.width}px`,
              maxWidth: 'calc(100vw - 16px)',
              zIndex: effectiveZIndex,
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
