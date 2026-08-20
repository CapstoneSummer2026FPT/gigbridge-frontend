import { useEffect, useRef, useState, useMemo } from 'react';
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
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
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
      // Auto focus search input when opened
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    } else {
      setSearchQuery('');
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`cs-container ${open ? 'is-open' : ''} ${className}`}>
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
              {selectedOption.badge && <span className="cs-badge">{selectedOption.badge}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </div>
          ) : (
            <span className="text-[var(--gb-text-muted,var(--text-muted,#95959f))]">{placeholder}</span>
          )}
        </div>

        <ChevronDown size={16} className={`cs-arrow ${open ? 'is-open' : ''}`} />
      </button>

      {/* Popover Menu */}
      {open && (
        <div className="cs-popover">
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
                      {option.badge && <span className="cs-badge">{option.badge}</span>}
                      <span className="truncate">{option.label}</span>
                    </div>

                    {isSelected && <Check size={14} className="shrink-0 text-[var(--brand,#494be7)]" />}
                  </button>
                );
              })
            ) : (
              <div className="cs-empty">{emptyMessage}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
