import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ContractDto } from '../../../types/models/Contract';
import type { Review } from '../../../types/models/Job';
import type { UserRole } from '../../../types/models/User';
import { ProjectReviewForm } from './ProjectReviewForm';

interface ProjectReviewDialogProps {
  open: boolean;
  contract: ContractDto | null;
  role: UserRole;
  onClose: () => void;
  onSubmitted: (review: Review) => void;
}

export function ProjectReviewDialog({ open, contract, role, onClose, onSubmitted }: ProjectReviewDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open || !contract) return null;

  return (
    <div className="review-dialog-backdrop" role="presentation">
      <div className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="project-review-title">
        <header className="review-dialog-header">
          <div>
            <h2 id="project-review-title">{t('reviews.title')}</h2>
            <p>{t('reviews.subtitle')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </header>
        <div className="review-dialog-body">
          <ProjectReviewForm contract={contract} role={role} onCancel={onClose} onSubmitted={onSubmitted} />
        </div>
      </div>
    </div>
  );
}
