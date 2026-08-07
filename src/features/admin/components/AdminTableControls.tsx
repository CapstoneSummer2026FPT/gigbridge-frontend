import { useEffect, useId, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ADMIN_TABLE_PAGE_SIZES = [10, 20, 50] as const;

interface AdminTablePageSizeProps {
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
  totalEntries?: number;
}

export function AdminTablePageSize({
  pageSize,
  onPageSizeChange,
  disabled = false,
  totalEntries,
}: AdminTablePageSizeProps) {
  const selectId = useId();

  return (
    <div className="flex items-center justify-end gap-2 text-xs sm:text-sm text-secondary">
      <label htmlFor={selectId} className="whitespace-nowrap">Show</label>
      <select
        id={selectId}
        aria-label="Entries per page"
        className="input-gb min-w-[72px] cursor-pointer px-3 py-2 text-sm font-semibold"
        value={pageSize}
        disabled={disabled}
        onChange={event => onPageSizeChange(Number(event.target.value))}
      >
        {ADMIN_TABLE_PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
      </select>
      <span className="whitespace-nowrap">entries{typeof totalEntries === 'number' ? ` of ${totalEntries}` : ''}</span>
    </div>
  );
}

export function getAdminPaginationPages(currentPage: number, totalPages: number, maximum = 4): number[] {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const safeCurrent = Math.min(safeTotal, Math.max(1, Math.floor(currentPage)));
  const windowSize = Math.max(1, Math.floor(maximum));
  const step = Math.max(1, windowSize - 1);
  const start = Math.floor((safeCurrent - 1) / step) * step + 1;
  const end = Math.min(safeTotal, start + windowSize - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

interface AdminTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function AdminTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  ariaLabel = 'Table pagination',
}: AdminTablePaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  const safeCurrent = Math.min(safeTotal, Math.max(1, currentPage));
  const windowSize = 4;
  const defaultSequenceStart = getAdminPaginationPages(safeCurrent, safeTotal, windowSize)[0];
  const [sequenceStart, setSequenceStart] = useState(defaultSequenceStart);
  const currentFitsSequence = safeCurrent >= sequenceStart && safeCurrent <= sequenceStart + windowSize - 1;
  const effectiveSequenceStart = currentFitsSequence ? sequenceStart : defaultSequenceStart;
  const sequenceEnd = Math.min(safeTotal, effectiveSequenceStart + windowSize - 1);
  const pages = Array.from(
    { length: sequenceEnd - effectiveSequenceStart + 1 },
    (_, index) => effectiveSequenceStart + index,
  );
  const firstSequencePage = pages[0];
  const lastSequencePage = pages[pages.length - 1];
  const showFirstPage = firstSequencePage !== 1;
  const showLastPage = lastSequencePage !== safeTotal;
  const buttonClass = 'inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-secondary transition-all hover:border-cyan/50 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-35';

  useEffect(() => {
    if (sequenceStart !== effectiveSequenceStart) setSequenceStart(effectiveSequenceStart);
  }, [effectiveSequenceStart, sequenceStart]);

  const navigateToPage = (targetPage: number) => {
    const target = Math.min(safeTotal, Math.max(1, targetPage));
    let nextSequenceStart = effectiveSequenceStart;

    if (target > safeCurrent && target >= lastSequencePage) {
      nextSequenceStart = Math.min(target, Math.max(1, safeTotal - windowSize + 1));
    } else if (target < safeCurrent && target <= firstSequencePage) {
      const previousSequenceStart = Math.max(1, firstSequencePage - windowSize + 1);
      nextSequenceStart = target >= previousSequenceStart
        ? previousSequenceStart
        : getAdminPaginationPages(target, safeTotal, windowSize)[0];
    } else if (target < firstSequencePage || target > lastSequencePage) {
      nextSequenceStart = getAdminPaginationPages(target, safeTotal, windowSize)[0];
    }

    setSequenceStart(nextSequenceStart);
    onPageChange(target);
  };

  const renderPageButton = (page: number) => {
    const active = page === safeCurrent;
    return (
      <button
        type="button"
        key={page}
        aria-label={`Page ${page}`}
        aria-current={active ? 'page' : undefined}
        disabled={disabled}
        className={`${buttonClass} ${active ? '!border-cyan !bg-cyan/20 !text-cyan shadow-[0_0_18px_rgba(34,211,238,0.55),inset_0_0_12px_rgba(34,211,238,0.12)]' : ''}`}
        onClick={() => navigateToPage(page)}
      >
        {page}
      </button>
    );
  };

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label={ariaLabel}>
      <button
        type="button"
        className={buttonClass}
        aria-label="Previous"
        disabled={disabled || safeCurrent <= 1}
        onClick={() => navigateToPage(safeCurrent - 1)}
      >
        <ChevronLeft size={17} aria-hidden="true" />
        <span className="hidden sm:inline ml-1">Previous</span>
      </button>

      <div className="flex items-center gap-2" aria-label="Page numbers">
        {showFirstPage && renderPageButton(1)}
        {showFirstPage && firstSequencePage > 2 && (
          <button
            type="button"
            className="inline-flex h-10 min-w-8 items-center justify-center rounded-lg px-1 text-muted transition-colors hover:bg-white/5 hover:text-cyan disabled:opacity-35"
            aria-label={`Go back to page ${firstSequencePage - 1}`}
            title={`Previous pages — go to page ${firstSequencePage - 1}`}
            disabled={disabled}
            onClick={() => navigateToPage(firstSequencePage - 1)}
          >
            …
          </button>
        )}
        {pages.map(renderPageButton)}
        {showLastPage && lastSequencePage < safeTotal - 1 && (
          <button
            type="button"
            className="inline-flex h-10 min-w-8 items-center justify-center rounded-lg px-1 text-muted transition-colors hover:bg-white/5 hover:text-cyan disabled:opacity-35"
            aria-label={`Continue to page ${lastSequencePage + 1}`}
            title={`More pages — go to page ${lastSequencePage + 1}`}
            disabled={disabled}
            onClick={() => navigateToPage(lastSequencePage + 1)}
          >
            …
          </button>
        )}
        {showLastPage && renderPageButton(safeTotal)}
      </div>

      <button
        type="button"
        className={buttonClass}
        aria-label="Next"
        disabled={disabled || safeCurrent >= safeTotal}
        onClick={() => navigateToPage(safeCurrent + 1)}
      >
        <span className="hidden sm:inline mr-1">Next</span>
        <ChevronRight size={17} aria-hidden="true" />
      </button>
    </nav>
  );
}
