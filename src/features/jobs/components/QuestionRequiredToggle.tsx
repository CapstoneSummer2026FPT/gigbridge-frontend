import { useTranslation } from 'react-i18next';

interface QuestionRequiredToggleProps {
  isRequired: boolean;
  questionNumber: number;
  onChange: (isRequired: boolean) => void;
}

export function QuestionRequiredToggle({
  isRequired,
  questionNumber,
  onChange,
}: QuestionRequiredToggleProps) {
  const { t } = useTranslation('common');

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-muted-foreground">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={isRequired}
        onChange={event => onChange(event.target.checked)}
        aria-label={t('postJob.requiredStatus', { number: questionNumber })}
      />
      <span className="relative h-5 w-9 rounded-full bg-muted transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-background after:shadow-sm after:transition-transform peer-checked:bg-[var(--brand)] peer-checked:after:translate-x-4 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--brand)]" />
      <span className={isRequired ? 'text-[var(--brand)]' : 'text-muted-foreground'}>
        {t(isRequired ? 'postJob.required' : 'postJob.optional')}
      </span>
    </label>
  );
}
