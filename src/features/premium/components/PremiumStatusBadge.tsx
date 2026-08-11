import { Crown } from 'lucide-react';
import '../../../shared/styles/glass-effects.css';

export function PremiumStatusBadge({ active, compact = false }: { active: boolean; compact?: boolean }) {
  if (active) {
    return (
      <span
        className={`top-nav-premium-active ${compact ? 'text-[11px] px-2.5 py-0.5' : ''}`}
        title="Client Premium active"
        style={{ textTransform: 'none' }}
      >
        <span className="top-nav-crown-badge-corner" aria-hidden="true">
          <Crown size={10} strokeWidth={2.5} className="fill-[var(--brand,#494be7)] text-[var(--brand,#494be7)]" />
        </span>
        <span>{compact ? 'Premium' : 'Premium Member'}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-bold uppercase tracking-wider"
      title="Standard plan"
    >
      Standard
    </span>
  );
}
