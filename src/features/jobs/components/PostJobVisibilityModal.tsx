import type { ChangeEvent } from 'react';
import { AlertTriangle, Check, Globe, LoaderCircle, UserRoundCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { JobPostVisibility } from '../../../types/models/Job';

interface PostJobVisibilityModalProps {
  isOpen: boolean;
  value: JobPostVisibility;
  isSubmitting: boolean;
  onChange: (value: JobPostVisibility) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PostJobVisibilityModal({
  isOpen,
  value,
  isSubmitting,
  onChange,
  onCancel,
  onConfirm,
}: PostJobVisibilityModalProps) {
  const { t } = useTranslation('common');

  if (!isOpen) return null;

  const handleVisibilityChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(Number(event.target.value) as JobPostVisibility);
  };

  const handleCancel = (): void => {
    if (!isSubmitting) onCancel();
  };

  const options = [
    {
      value: JobPostVisibility.Public,
      label: t('postJob.public'),
      description: t('postJobWizard.visibilityModal.publicDescription'),
      icon: <Globe size={18} />,
    },
    {
      value: JobPostVisibility.InviteOnly,
      label: t('postJob.inviteOnly'),
      description: t('postJobWizard.visibilityModal.inviteOnlyDescription'),
      icon: <UserRoundCheck size={18} />,
    },
  ] as const;

  return (
    <div
      className="job-post-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-post-visibility-modal-title"
    >
      <button
        type="button"
        className="job-post-modal-backdrop border-0 cursor-default"
        onClick={handleCancel}
        aria-label={t('common.close')}
      />

      <div className="job-post-modal-container !max-w-xl">
        <div className="job-post-modal-accent-bar" />

        <header className="job-post-modal-header">
          <div className="job-post-modal-header-title">
            <span className="job-post-modal-icon-sparkle">
              <Globe size={20} />
            </span>
            <div>
              <h3 id="job-post-visibility-modal-title">
                {t('postJobWizard.visibilityModal.title')}
              </h3>
              <p>{t('postJobWizard.visibilityModal.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            className="job-post-modal-close-btn"
            onClick={handleCancel}
            disabled={isSubmitting}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="job-post-modal-content">
          <div className="grid gap-3" role="radiogroup" aria-label={t('postJob.visibility')}>
            {options.map(option => {
              const isSelected = value === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm'
                      : 'border-border bg-card hover:border-[var(--brand)]/45 hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="job-post-visibility"
                    value={option.value}
                    checked={isSelected}
                    onChange={handleVisibilityChange}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    isSelected
                      ? 'bg-[var(--brand)] text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {option.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm font-extrabold text-foreground">
                      {option.label}
                    </strong>
                    <span className="mt-1 block text-xs font-medium leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                    isSelected
                      ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                      : 'border-border text-transparent'
                  }`}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-amber-600 bg-amber-600 p-4 text-white shadow-sm">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-white" />
            <div>
              <strong className="block text-sm font-extrabold text-white">
                {t('postJobWizard.visibilityModal.warningTitle')}
              </strong>
              <p className="mt-1 text-xs font-medium leading-relaxed text-white/90">
                {t('postJobWizard.visibilityModal.warning')}
              </p>
            </div>
          </div>
        </div>

        <footer className="job-post-modal-footer">
          <button
            type="button"
            className="job-post-btn-secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="job-post-btn-primary gap-2"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}
            {t('postJobWizard.visibilityModal.confirm')}
          </button>
        </footer>
      </div>
    </div>
  );
}
