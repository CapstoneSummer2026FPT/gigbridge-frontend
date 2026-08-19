import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AppLayout } from '../../../shared/components/AppLayout';
import { profileGetAPI } from '../../../api/profileAPI';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import type { PublicFreelancerSummaryDto } from '../../../types/models/Profile';

export function FreelancerDirectoryScreen() {
  const { isAuthenticated } = useApp();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.trim() ?? '';
  const [freelancers, setFreelancers] = useState<readonly PublicFreelancerSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      const response = await profileGetAPI.getPublicFreelancers({
        page: 1,
        pageSize: 50,
        sort: 'featured',
        search: searchQuery || undefined,
      });
      if (!active) return;
      if (response.success && response.data) setFreelancers(response.data.items);
      else setError(response.message || 'Không thể tải danh sách freelancer.');
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [searchQuery]);

  return (
    <AppLayout showSidebar={false}>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-bold uppercase tracking-wider text-brand">Cộng đồng chuyên gia</p>
        <h1 className="mt-2 text-4xl font-black text-text-primary">Tìm freelancer chuyên nghiệp</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">Khám phá hồ sơ của các freelancer đang hoạt động trên GigBridge.</p>
        {searchQuery ? (
          <p className="mt-4 text-sm font-semibold text-brand">
            {t('topNavSearch.resultsFor', { query: searchQuery })}
          </p>
        ) : null}
        {loading ? <p className="mt-8">Loading...</p> : null}
        {error ? <p className="mt-8 text-destructive">{error}</p> : null}
        {!loading && !error && freelancers.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center text-text-secondary">
            {t('topNavSearch.noTalentResults')}
          </p>
        ) : null}
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {freelancers.map(freelancer => (
            <article key={freelancer.userId} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-xl font-black text-text-primary">
                <Link
                  className="hover:text-brand"
                  to={isAuthenticated
                    ? `/profile/freelancer/${encodeURIComponent(freelancer.userId)}`
                    : `/freelancers/${encodeURIComponent(freelancer.userId)}`}
                >
                  {freelancer.userFullName || 'Freelancer GigBridge'}
                </Link>
              </h2>
              <p className="mt-2 font-bold text-brand">{freelancer.title || freelancer.majorName || 'Freelancer chuyên nghiệp'}</p>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-text-secondary">{freelancer.bio || 'Hồ sơ freelancer trên GigBridge.'}</p>
              <p className="mt-4 text-sm font-semibold text-text-muted">{freelancer.skills.slice(0, 5).map(skill => skill.skillName).join(' · ')}</p>
            </article>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
