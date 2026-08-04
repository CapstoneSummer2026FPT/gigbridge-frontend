import { Crown } from 'lucide-react';

export function PremiumStatusBadge({ active, compact = false }: { active: boolean; compact?: boolean }) {
  return (
    <span
      className={`premium-status-badge ${active ? 'active' : 'free'} ${compact ? 'compact' : ''}`}
      title={active ? 'Client Premium is active' : 'Standard client plan'}
    >
      <Crown size={compact ? 11 : 13} />
      {active ? 'Premium' : 'Standard'}
    </span>
  );
}
