import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Trophy, TrendingUp, Crown } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';
import type { FreelancerSummaryDto } from '../../../types/models/Profile';
import '../styles/top-freelancers-leaderboard.css';

export interface TopFreelancersLeaderboardProps {
  className?: string;
  limit?: number;
  initialData?: FreelancerSummaryDto[];
  onFreelancerClick?: (freelancer: FreelancerSummaryDto) => void;
}

export function TopFreelancersLeaderboard({
  className = '',
  limit = 5,
  initialData,
  onFreelancerClick,
}: TopFreelancersLeaderboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [freelancers, setFreelancers] = useState<FreelancerSummaryDto[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) {
      setFreelancers(initialData);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    profileGetAPI
      .getFreelancers({ page: 1, pageSize: limit, sort: 'elo' })
      .then(response => {
        if (isMounted && response.success && response.data) {
          setFreelancers(response.data.items);
        }
      })
      .catch(error => {
        console.error('Failed to load top freelancers leaderboard:', error);
        if (isMounted) setFreelancers([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialData, limit]);

  const handleItemClick = (freelancer: FreelancerSummaryDto) => {
    if (onFreelancerClick) {
      onFreelancerClick(freelancer);
      return;
    }
    const path = getProfilePath(freelancer.userId || freelancer.freelancerProfilesId, 'freelancer');
    if (path) {
      navigate(path);
    }
  };

  return (
    <div className={`freelancer-ranking-card ${className}`.trim()}>
      <div className="freelancer-ranking-header">
        <div className="freelancer-ranking-title">
          <div className="w-8 h-8 rounded-xl bg-[var(--cp-accent-dim,#6366f11c)] text-[var(--brand,#494be7)] flex items-center justify-center flex-shrink-0">
            <Trophy size={18} />
          </div>
          <span className="font-extrabold text-[15px]">{t('jobs.topFreelancers')}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--cp-accent-dim,#6366f11c)] text-[var(--brand,#494be7)] border border-[rgba(99,102,241,0.2)] flex items-center gap-1">
          <TrendingUp size={12} />
          {t('jobs.eloRatings')}
        </span>
      </div>

      <div className="ranking-list">
        {loading ? (
          <div className="p-4 text-xs text-[var(--text-muted)] text-center font-medium">
            Loading rankings...
          </div>
        ) : freelancers.length === 0 ? (
          <p className="p-4 text-xs text-[var(--text-muted)] text-center font-medium">
            No freelancer ranking data available.
          </p>
        ) : (
          freelancers.map((freelancer, index) => {
            const rank = index + 1;
            const isTop1 = rank === 1;

            return (
              <div
                key={freelancer.freelancerProfilesId}
                onClick={() => handleItemClick(freelancer)}
                className={`ranking-item ${isTop1 ? 'ranking-item-top1' : ''}`}
              >
                <div className="ranking-user-info">
                  <div className={`ranking-position ${isTop1 ? 'ranking-position-top1' : ''}`}>
                    {isTop1 ? <Crown size={14} /> : `#${rank}`}
                  </div>
                  <div className="relative shrink-0">
                    <img
                      src={freelancer.userAvatar || '/img/avatar-fallback.png'}
                      alt={freelancer.userFullName || 'Freelancer'}
                      className={`ranking-avatar ${isTop1 ? 'ranking-avatar-top1' : ''}`}
                    />
                  </div>
                  <div className="ranking-text-details">
                    <span className="ranking-name" title={freelancer.userFullName || 'Freelancer'}>
                      {freelancer.userFullName || 'Freelancer'}
                    </span>
                    <span className="ranking-role" title={freelancer.title || 'Independent professional'}>
                      {freelancer.title || 'Independent professional'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="ranking-elo-value">{freelancer.eloPoints}</span>
                  <span className="ranking-elo-label">{t('jobs.elo')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default TopFreelancersLeaderboard;
