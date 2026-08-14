import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
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
      <article className="mx-auto max-w-4xl px-4 py-10">
        {loading ? <p>Loading...</p> : null}
        {!loading && !profile ? <><h1 className="text-3xl font-black">Không tìm thấy hồ sơ</h1><a className="mt-5 inline-block text-brand" href="/freelancers">Xem danh sách freelancer</a></> : null}
        {profile ? <>
          <h1 className="text-4xl font-black text-text-primary">{profile.userFullName || 'Freelancer GigBridge'}</h1>
          <p className="mt-3 text-xl font-bold text-brand">{profile.title || profile.majorName || 'Freelancer chuyên nghiệp'}</p>
          <p className="mt-2 text-text-secondary">{profile.location || 'Việt Nam'}</p>
          <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-2xl font-black">Giới thiệu</h2>
            <p className="mt-4 whitespace-pre-line leading-7 text-text-secondary">{profile.bio || 'Freelancer trên GigBridge.'}</p>
          </section>
          <section className="mt-5 rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-2xl font-black">Kỹ năng</h2>
            <p className="mt-4 font-semibold text-text-secondary">{profile.skills.map(skill => skill.skillName).join(' · ') || 'Đang cập nhật'}</p>
          </section>
          <a className="mt-6 inline-block rounded-xl bg-brand px-5 py-3 font-bold text-white" href={`/auth/login?returnUrl=${encodeURIComponent(`/freelancers/${profile.userId}`)}`}>Đăng nhập để mời freelancer</a>
        </> : null}
      </article>
    </AppLayout>
  );
}
