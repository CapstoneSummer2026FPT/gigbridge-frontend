import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AppLayout } from '../../../shared/components/AppLayout';
import { profileGetAPI } from '../../../api/profileAPI';
import type { PublicFreelancerProfileDto } from '../../../types/models/Profile';

export function PublicFreelancerProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicFreelancerProfileDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      if (!id) {
        setLoading(false);
        return;
      }
      const response = await profileGetAPI.getPublicFreelancerProfile(id);
      if (active && response.success && response.data) setProfile(response.data);
      if (active) setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [id]);

  return (
    <AppLayout showSidebar={false}>
      <article className="mx-auto max-w-4xl px-3 sm:px-6 py-6 sm:py-10">
        {loading ? <p className="text-sm text-text-muted">Loading...</p> : null}
        {!loading && !profile ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-black">Không tìm thấy hồ sơ</h1>
            <Link className="mt-5 inline-block text-brand font-bold text-sm" to="/freelancers">
              Xem danh sách freelancer
            </Link>
          </>
        ) : null}
        {profile ? (
          <>
            <h1 className="text-2xl sm:text-4xl font-black text-text-primary">{profile.userFullName || 'Freelancer GigBridge'}</h1>
            <p className="mt-2 sm:mt-3 text-base sm:text-xl font-bold text-brand">{profile.title || profile.majorName || 'Freelancer chuyên nghiệp'}</p>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-text-secondary">{profile.location || 'Việt Nam'}</p>
            <section className="mt-6 sm:mt-8 rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm">
              <h2 className="text-lg sm:text-2xl font-black">Giới thiệu</h2>
              <p className="mt-3 sm:mt-4 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-text-secondary">{profile.bio || 'Freelancer trên GigBridge.'}</p>
            </section>
            <section className="mt-4 sm:mt-5 rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm">
              <h2 className="text-lg sm:text-2xl font-black">Kỹ năng</h2>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm font-semibold text-text-secondary leading-relaxed">{profile.skills.map(skill => skill.skillName).join(' · ') || 'Đang cập nhật'}</p>
            </section>
            <Link
              className="mt-6 inline-block w-full sm:w-auto text-center rounded-xl bg-brand px-5 py-3 font-bold text-white shadow-md hover:bg-brand-hover transition-colors min-h-[44px]"
              to={`/auth/login?returnUrl=${encodeURIComponent(`/freelancers/${profile.userId}`)}`}
            >
              Đăng nhập để mời freelancer
            </Link>
          </>
        ) : null}
      </article>
    </AppLayout>
  );
}
