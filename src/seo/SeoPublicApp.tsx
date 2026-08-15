import type { ReactNode } from 'react';
import type { MarketingRoute, SeoRouteState } from './types';

interface SeoPublicAppProps {
  readonly state: SeoRouteState;
}

const marketingContent: Record<MarketingRoute, { readonly heading: string; readonly body: string }> = {
  '/': { heading: 'Kết nối doanh nghiệp với freelancer phù hợp', body: 'GigBridge tạo ra môi trường hợp tác minh bạch, từ khâu tìm kiếm nhân tài đến quản lý công việc và thanh toán.' },
  '/about': { heading: 'Về GigBridge', body: 'Chúng tôi xây dựng cầu nối đáng tin cậy giữa nhu cầu kinh doanh và năng lực của cộng đồng freelancer.' },
  '/careers': { heading: 'Cơ hội nghề nghiệp', body: 'Cùng GigBridge phát triển các sản phẩm giúp thị trường việc làm linh hoạt trở nên hiệu quả và minh bạch hơn.' },
  '/faq': { heading: 'Câu hỏi thường gặp', body: 'Tìm câu trả lời về tài khoản, đăng việc, ứng tuyển, hợp đồng, thanh toán và các tính năng của GigBridge.' },
  '/guide': { heading: 'Hướng dẫn sử dụng', body: 'Bắt đầu với GigBridge qua các hướng dẫn dành riêng cho doanh nghiệp và freelancer.' },
  '/press-kit': { heading: 'Bộ tài nguyên truyền thông', body: 'Truy cập thông tin và tài nguyên thương hiệu chính thức của GigBridge.' },
  '/terms': { heading: 'Điều khoản sử dụng', body: 'Các quy định áp dụng khi truy cập và sử dụng dịch vụ GigBridge.' },
  '/privacy': { heading: 'Chính sách quyền riêng tư', body: 'Cách GigBridge thu thập, sử dụng và bảo vệ dữ liệu cá nhân của người dùng.' },
};

const formatBudget = (minimum?: number | null, maximum?: number | null, currency = 'GIG'): string => {
  if (minimum == null && maximum == null) return 'Ngân sách thỏa thuận';
  const formatter = new Intl.NumberFormat('vi-VN');
  if (minimum != null && maximum != null) return `${formatter.format(minimum)} - ${formatter.format(maximum)} ${currency}`;
  return `${formatter.format(minimum ?? maximum ?? 0)} ${currency}`;
};

const safeImageUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value, 'https://gigbridge.id.vn');
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const renderPage = (state: SeoRouteState): ReactNode => {
  if (state.kind === 'marketing') {
    const content = marketingContent[state.route];
    return <section className="seo-hero"><p className="seo-eyebrow">GigBridge</p><h1>{content.heading}</h1><p>{content.body}</p><div className="seo-actions"><a className="seo-primary" href="/jobs">Tìm việc freelance</a><a href="/freelancers">Tìm freelancer</a></div></section>;
  }
  if (state.kind === 'jobs') {
    return <><section className="seo-heading"><p className="seo-eyebrow">Cơ hội mới</p><h1>Việc làm freelance</h1><p>Khám phá các dự án công khai đang nhận đề xuất trên GigBridge.</p></section><div className="seo-grid">{state.jobs.map(job => <article className="seo-card" key={job.jobPostsId}><p className="seo-muted">{job.categoryName ?? job.majorName ?? 'Dự án freelance'}</p><h2><a href={`/jobs/${encodeURIComponent(job.jobPostsId)}`}>{job.title}</a></h2><p>{job.descriptionPreview}</p><strong>{formatBudget(job.budgetMin, job.budgetMax)}</strong><p className="seo-tags">{[...(job.skillNames ?? []), ...(job.customSkillNames ?? [])].slice(0, 5).join(' · ')}</p></article>)}</div></>;
  }
  if (state.kind === 'job') {
    const skills = [...(state.job.skills ?? []).map(skill => skill.skillName ?? skill.name ?? ''), ...(state.job.customSkillNames ?? [])].filter(Boolean);
    return <article className="seo-detail"><nav aria-label="Breadcrumb"><a href="/jobs">Việc làm</a><span>/</span><span>{state.job.title}</span></nav><p className="seo-eyebrow">{state.job.categoryName ?? state.job.majorName ?? 'Dự án freelance'}</p><h1>{state.job.title}</h1><p className="seo-lead">{state.job.clientFullName ?? state.job.fullName} · {state.job.location ?? 'Làm việc từ xa'}</p><div className="seo-facts"><strong>{formatBudget(state.job.budgetMin, state.job.budgetMax, state.job.currency ?? 'GIG')}</strong><span>{state.job.estimatedDuration ?? 'Thời gian thỏa thuận'}</span></div><section><h2>Mô tả công việc</h2><p className="seo-preline">{state.job.description}</p></section>{skills.length > 0 ? <section><h2>Kỹ năng</h2><p className="seo-tags">{skills.join(' · ')}</p></section> : null}<a className="seo-primary" href={`/auth/login?returnUrl=${encodeURIComponent(`/jobs/${state.job.jobPostsId}`)}`}>Đăng nhập để ứng tuyển</a></article>;
  }
  if (state.kind === 'freelancers') {
    return <><section className="seo-heading"><p className="seo-eyebrow">Cộng đồng chuyên gia</p><h1>Tìm freelancer chuyên nghiệp</h1><p>Khám phá hồ sơ của các freelancer đang hoạt động trên GigBridge.</p></section><div className="seo-grid">{state.freelancers.items.map(freelancer => <article className="seo-card" key={freelancer.userId}>{safeImageUrl(freelancer.userAvatar) ? <img className="seo-avatar" src={safeImageUrl(freelancer.userAvatar)} alt={`Ảnh đại diện ${freelancer.userFullName ?? 'freelancer'}`} /> : null}<h2><a href={`/freelancers/${encodeURIComponent(freelancer.userId)}`}>{freelancer.userFullName ?? 'Freelancer GigBridge'}</a></h2><strong>{freelancer.title ?? freelancer.majorName ?? 'Freelancer chuyên nghiệp'}</strong><p>{freelancer.bio ?? 'Hồ sơ freelancer trên GigBridge.'}</p><p className="seo-tags">{(freelancer.skills ?? []).slice(0, 5).map(skill => skill.skillName).join(' · ')}</p></article>)}</div></>;
  }
  if (state.kind === 'freelancer') {
    const freelancer = state.freelancer;
    return <article className="seo-detail"><nav aria-label="Breadcrumb"><a href="/freelancers">Freelancer</a><span>/</span><span>{freelancer.userFullName ?? 'Hồ sơ'}</span></nav>{safeImageUrl(freelancer.userAvatar) ? <img className="seo-avatar seo-avatar-large" src={safeImageUrl(freelancer.userAvatar)} alt={`Ảnh đại diện ${freelancer.userFullName ?? 'freelancer'}`} /> : null}<h1>{freelancer.userFullName ?? 'Freelancer GigBridge'}</h1><p className="seo-lead">{freelancer.title ?? freelancer.majorName ?? 'Freelancer chuyên nghiệp'} · {freelancer.location ?? 'Việt Nam'}</p>{freelancer.showProVerifiedBadge ? <p className="seo-badge">Hồ sơ đã xác minh</p> : null}<section><h2>Giới thiệu</h2><p className="seo-preline">{freelancer.bio ?? 'Freelancer trên GigBridge.'}</p></section><section><h2>Kỹ năng</h2><p className="seo-tags">{(freelancer.skills ?? []).map(skill => skill.skillName).join(' · ') || 'Đang cập nhật'}</p></section><a className="seo-primary" href={`/auth/login?returnUrl=${encodeURIComponent(`/freelancers/${freelancer.userId}`)}`}>Đăng nhập để mời freelancer</a></article>;
  }
  return <section className="seo-hero"><p className="seo-eyebrow">{state.kind === 'unavailable' ? '503' : '404'}</p><h1>{state.kind === 'unavailable' ? 'Dịch vụ tạm thời gián đoạn' : 'Không tìm thấy nội dung'}</h1><p>Vui lòng quay lại trang chủ hoặc thử lại sau.</p><a className="seo-primary" href="/">Về trang chủ</a></section>;
};

export function SeoPublicApp({ state }: SeoPublicAppProps) {
  return <div className="seo-shell"><header><a className="seo-brand" href="/">GigBridge</a><nav aria-label="Điều hướng chính"><a href="/jobs">Việc làm</a><a href="/freelancers">Freelancer</a><a href="/guide">Hướng dẫn</a><a href="/auth/login">Đăng nhập</a></nav></header><main>{renderPage(state)}</main><footer><span>© {new Date().getUTCFullYear()} GigBridge</span><a href="/terms">Điều khoản</a><a href="/privacy">Quyền riêng tư</a></footer></div>;
}
