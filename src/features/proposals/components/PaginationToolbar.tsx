interface PaginationToolbarProps {
  showToolbars: boolean;
  proposalsPerPage: number;
  currentPage: number;
  totalItems: number;
  totalPages: number;
  onPerPageChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function PaginationToolbar({
  showToolbars,
  proposalsPerPage,
  currentPage,
  totalItems,
  totalPages,
  onPerPageChange,
  onPrevPage,
  onNextPage,
}: PaginationToolbarProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * proposalsPerPage + 1;
  const endItem = Math.min(currentPage * proposalsPerPage, totalItems);

  return (
    <div className={`proposal-pagination-toolbar ${showToolbars ? 'visible' : 'hidden'}`}>
      <div>
        <span>Per page</span>
        <select value={proposalsPerPage} onChange={event => onPerPageChange(Number(event.target.value))}>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>
      <div className="proposal-pagination-info">
        <span>
          {totalItems === 0
            ? 'No proposals'
            : `${startItem}–${endItem} of ${totalItems}`}
        </span>
      </div>
      <div className="proposal-pagination-controls">
        <button
          disabled={currentPage === 1}
          onClick={onPrevPage}
        >
          ← Prev
        </button>
        <button
          disabled={currentPage >= totalPages}
          onClick={onNextPage}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
