import type { MarketingRoute, SeoMetadata, SeoRouteState } from './types';

export const SITE_URL = 'https://gigbridge.id.vn';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/img/seo-og-default.png`;

const MARKETING_COPY: Record<MarketingRoute, { readonly title: string; readonly description: string }> = {
  '/': { title: 'GigBridge | Thuê freelancer và tìm việc freelance', description: 'GigBridge kết nối doanh nghiệp với freelancer tại Việt Nam qua ghép nối thông minh, hợp đồng điện tử, milestone và thanh toán an toàn.' },
  '/about': { title: 'Về GigBridge | Kết nối nhân tài freelance', description: 'Tìm hiểu sứ mệnh của GigBridge trong việc kết nối doanh nghiệp với cộng đồng freelancer.' },
  '/careers': { title: 'Cơ hội nghề nghiệp tại GigBridge', description: 'Khám phá cơ hội đồng hành cùng GigBridge và xây dựng tương lai việc làm linh hoạt.' },
  '/faq': { title: 'Câu hỏi thường gặp | GigBridge', description: 'Giải đáp các câu hỏi phổ biến về tài khoản, việc làm, hợp đồng và thanh toán trên GigBridge.' },
  '/guide': { title: 'Hướng dẫn sử dụng GigBridge', description: 'Hướng dẫn doanh nghiệp và freelancer bắt đầu, tìm việc và hợp tác trên GigBridge.' },
  '/press-kit': { title: 'Bộ tài nguyên truyền thông | GigBridge', description: 'Thông tin và tài nguyên thương hiệu chính thức của GigBridge.' },
  '/terms': { title: 'Điều khoản sử dụng | GigBridge', description: 'Đọc điều khoản sử dụng nền tảng GigBridge dành cho doanh nghiệp và freelancer.' },
  '/privacy': { title: 'Chính sách quyền riêng tư | GigBridge', description: 'Tìm hiểu cách GigBridge thu thập, sử dụng và bảo vệ dữ liệu cá nhân.' },
};

const plainText = (value: string): string => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const excerpt = (value: string, maxLength = 155): string => {
  const normalized = plainText(value);
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

const breadcrumb = (name: string, path: string): Readonly<Record<string, unknown>> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'GigBridge', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
  ],
});

export const getSeoMetadata = (state: SeoRouteState): SeoMetadata => {
  if (state.kind === 'marketing') {
    const copy = MARKETING_COPY[state.route];
    const jsonLd = state.route === '/'
      ? [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'GigBridge', url: SITE_URL, logo: `${SITE_URL}/apple-touch-icon.png` }, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'GigBridge', url: SITE_URL, inLanguage: 'vi-VN' }]
      : [breadcrumb(copy.title.split('|')[0].trim(), state.route)];
    return { ...copy, canonicalPath: state.route, robots: 'index, follow', jsonLd };
  }
  if (state.kind === 'jobs') {
    return { title: 'Việc làm freelance mới nhất | GigBridge', description: 'Khám phá các cơ hội việc làm freelance mới nhất, minh bạch về ngân sách và kỹ năng trên GigBridge.', canonicalPath: '/jobs', robots: 'index, follow', jsonLd: [breadcrumb('Việc làm freelance', '/jobs')] };
  }
  if (state.kind === 'job') {
    const path = `/jobs/${encodeURIComponent(state.job.jobPostsId)}`;
    const jobPosting: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'JobPosting', title: state.job.title, description: plainText(state.job.description), datePosted: state.job.createdAt, hiringOrganization: { '@type': 'Organization', name: state.job.clientFullName ?? state.job.fullName } };
    if (state.job.endDate) jobPosting.validThrough = state.job.endDate;
    if (state.job.location?.toLowerCase().includes('remote') || !state.job.location) jobPosting.jobLocationType = 'TELECOMMUTE';
    else jobPosting.jobLocation = { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: state.job.location, addressCountry: 'VN' } };
    return { title: `${state.job.title} | Việc làm freelance | GigBridge`, description: excerpt(state.job.description), canonicalPath: path, robots: 'index, follow', jsonLd: [breadcrumb(state.job.title, path), jobPosting] };
  }
  if (state.kind === 'freelancers') {
    return { title: 'Tìm freelancer chuyên nghiệp | GigBridge', description: 'Khám phá kỹ năng, kinh nghiệm và danh mục chuyên môn của freelancer đang hoạt động trên GigBridge.', canonicalPath: '/freelancers', robots: 'index, follow', jsonLd: [breadcrumb('Freelancer', '/freelancers')] };
  }
  if (state.kind === 'freelancer') {
    const name = state.freelancer.userFullName ?? 'Freelancer';
    const specialty = state.freelancer.title ?? state.freelancer.majorName ?? 'Freelancer chuyên nghiệp';
    const path = `/freelancers/${encodeURIComponent(state.freelancer.userId)}`;
    const allowIndexing = state.freelancer.allowSearchEngineIndexing === true;
    return {
      title: `${name} – ${specialty} | GigBridge`,
      description: excerpt(state.freelancer.bio ?? `${name} là ${specialty} trên GigBridge.`),
      canonicalPath: path,
      robots: allowIndexing ? 'index, follow' : 'noindex, nofollow',
      jsonLd: allowIndexing
        ? [breadcrumb(name, path), { '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name, jobTitle: specialty, image: state.freelancer.userAvatar ?? undefined } }]
        : [],
    };
  }
  return { title: state.kind === 'unavailable' ? 'Dịch vụ tạm thời gián đoạn | GigBridge' : 'Không tìm thấy trang | GigBridge', description: 'Nội dung bạn yêu cầu hiện không khả dụng.', canonicalPath: state.path, robots: 'noindex, nofollow', jsonLd: [] };
};
