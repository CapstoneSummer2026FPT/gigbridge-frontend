import { ChevronRight, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { EloSummary } from '../../../types/elo';

interface ClientEloScoreCardProps {
  isLoading: boolean;
  summary: EloSummary | null;
  onOpenHistory: () => void;
}

export function ClientEloScoreCard({
  isLoading,
  summary,
  onOpenHistory,
}: ClientEloScoreCardProps) {
  const { t } = useTranslation();
  const score = summary?.currentPoints;

  return (
    <article className="glass-card client-elo-compact-card" aria-labelledby="client-elo-card-title">
      <header className="client-elo-compact-header">
        <div>
          <ShieldCheck size={16} aria-hidden="true" />
          <h3 id="client-elo-card-title">{t('dashboard.eloPoint', 'Elo Point')}</h3>
        </div>
        <span>
          {isLoading
            ? t('dashboard.eloSyncing', 'Syncing')
            : summary
              ? t('dashboard.eloVerified', 'Verified')
              : t('dashboard.eloUnavailableBadge', 'Unavailable')}
        </span>
      </header>

      <div className="client-elo-compact-body">
        <div
          className="client-elo-gauge-compact"
          role="img"
          aria-label={t('dashboard.eloScoreAria', {
            defaultValue: 'Current Elo score: {{score}}',
            score: score ?? 0,
          })}
        >
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle className="client-elo-gauge-track" cx="100" cy="100" r="72" pathLength="100" transform="rotate(135 100 100)" />
            <circle className="client-elo-gauge-value" cx="100" cy="100" r="72" pathLength="100" transform="rotate(135 100 100)" />
          </svg>
          <div className="client-elo-gauge-copy-compact">
            <strong>{isLoading || score == null ? '—' : score.toLocaleString()}</strong>
          </div>
        </div>

        <div className="client-elo-compact-details">
          <span className="client-elo-strength-label">{t('dashboard.profileStrength', 'Profile strength')}</span>
          {summary && (
            <div className="client-elo-ledger-summary">
              <b>+{summary.totalGained.toLocaleString()}</b>
              <i aria-hidden="true" />
              <b>−{summary.totalLost.toLocaleString()}</b>
            </div>
          )}
          <button type="button" className="client-elo-compact-btn" onClick={onOpenHistory}>
            <span>{t('dashboard.eloHistory', 'View Elo history')}</span>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
