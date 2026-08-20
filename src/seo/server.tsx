import { renderToString } from 'react-dom/server';
import { SeoPublicApp } from './SeoPublicApp.js';
import { DEFAULT_OG_IMAGE, getSeoMetadata, SITE_URL } from './metadata.js';
import type {
  MarketingRoute,
  SeoFreelancerDetail,
  SeoFreelancerSummary,
  SeoJobDetail,
  SeoJobSummary,
  SeoPaginatedList,
  SeoRouteState,
  SeoSitemapResources,
} from './types';

interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T;
}

interface FetchResult<T> {
  readonly status: number;
  readonly data?: T;
}

export interface SeoHttpResponse {
  readonly status: number;
  readonly html: string;
}

const MARKETING_ROUTES = new Set<MarketingRoute>(['/', '/about', '/careers', '/faq', '/guide', '/press-kit', '/terms', '/privacy']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const runtimeEnvironment = (globalThis as typeof globalThis & {
  readonly process?: { readonly env?: Readonly<Record<string, string | undefined>> };
}).process?.env ?? {};

const styles = `:root{font-family:Inter,system-ui,sans-serif;color:#111827;background:#f8fafc}*{box-sizing:border-box}body{margin:0}.seo-shell{min-height:100vh;display:flex;flex-direction:column}.seo-shell>header,.seo-shell>footer{display:flex;align-items:center;gap:24px;padding:20px max(24px,calc((100% - 1120px)/2));background:#fff;border-bottom:1px solid #e5e7eb}.seo-shell>header nav{margin-left:auto;display:flex;flex-wrap:wrap;gap:18px}.seo-shell a{color:#3730a3;text-decoration:none}.seo-brand{font-size:24px;font-weight:900}.seo-shell main{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:64px 0;flex:1}.seo-hero,.seo-heading,.seo-detail{max-width:820px}.seo-hero h1,.seo-heading h1,.seo-detail h1{font-size:clamp(34px,6vw,64px);line-height:1.05;margin:12px 0 20px}.seo-heading h1,.seo-detail h1{font-size:clamp(32px,5vw,52px)}.seo-hero>p,.seo-heading>p,.seo-lead{font-size:18px;line-height:1.7;color:#475569}.seo-eyebrow{font-weight:800;color:#4f46e5;text-transform:uppercase;letter-spacing:.08em}.seo-actions,.seo-facts{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:28px}.seo-primary{display:inline-block;background:#4f46e5!important;color:#fff!important;padding:13px 20px;border-radius:12px;font-weight:800}.seo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:20px;margin-top:32px}.seo-card,.seo-detail section,.seo-facts{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:24px}.seo-card h2{font-size:21px}.seo-card p,.seo-detail p{line-height:1.65}.seo-muted,.seo-tags{color:#64748b}.seo-tags{font-weight:700}.seo-detail nav{display:flex;gap:10px;color:#64748b;margin-bottom:24px}.seo-detail section{margin:24px 0}.seo-preline{white-space:pre-line}.seo-avatar{width:72px;height:72px;border-radius:50%;object-fit:cover}.seo-avatar-large{width:112px;height:112px}.seo-badge{display:inline-block;padding:7px 12px;background:#dcfce7;color:#166534;border-radius:999px;font-weight:800}.seo-shell>footer{border-top:1px solid #e5e7eb;border-bottom:0;margin-top:auto;flex-wrap:wrap}.seo-shell>footer span{margin-right:auto}@media(max-width:640px){.seo-shell>header{align-items:flex-start}.seo-shell>header nav{gap:10px;font-size:14px}.seo-shell main{padding:40px 0}}`;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const getApiBaseUrl = (): URL | null => {
  const configured = runtimeEnvironment.SEO_API_BASE_URL ?? runtimeEnvironment.VITE_API_BASE_URL;
  if (!configured) return null;
  try {
    const url = new URL(configured.endsWith('/') ? configured : `${configured}/`);
    const configuredAllowlist = (runtimeEnvironment.SEO_API_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    const isGigBridgeOrigin = url.hostname === 'gigbridge.id.vn' || url.hostname.endsWith('.gigbridge.id.vn');
    const isAllowedConfiguredOrigin = configuredAllowlist.includes(url.origin);
    const isLocalDevelopment = runtimeEnvironment.NODE_ENV !== 'production' && url.hostname === 'localhost';
    if (url.protocol !== 'https:' && !isLocalDevelopment) return null;
    return isGigBridgeOrigin || isAllowedConfiguredOrigin || isLocalDevelopment ? url : null;
  } catch {
    return null;
  }
};

const fetchApi = async <T,>(relativePath: string): Promise<FetchResult<T>> => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return { status: 503 };
  try {
    const response = await fetch(new URL(relativePath, baseUrl), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { status: response.status };
    const payload: unknown = await response.json();
    if (!isRecord(payload) || payload.success !== true || !('data' in payload)) return { status: 502 };
    return { status: response.status, data: (payload as unknown as ApiEnvelope<T>).data };
  } catch {
    return { status: 503 };
  }
};

const normalizePath = (rawPath: string): string => {
  try {
    const path = new URL(rawPath, SITE_URL).pathname.replace(/\/{2,}/g, '/');
    return path.length > 1 ? path.replace(/\/$/, '') : path;
  } catch {
    return '/invalid';
  }
};

const stateForPath = async (rawPath: string): Promise<{ readonly status: number; readonly state: SeoRouteState }> => {
  const path = normalizePath(rawPath);
  if (MARKETING_ROUTES.has(path as MarketingRoute)) return { status: 200, state: { kind: 'marketing', route: path as MarketingRoute } };
  if (path === '/jobs') {
    const result = await fetchApi<readonly SeoJobSummary[]>('public/job-posts?pageIndex=1&pageSize=50');
    return result.data ? { status: 200, state: { kind: 'jobs', jobs: result.data } } : { status: result.status, state: { kind: 'unavailable', path } };
  }
  if (path === '/freelancers') {
    const result = await fetchApi<SeoPaginatedList<SeoFreelancerSummary>>('public/freelancers?page=1&pageSize=50&sort=featured');
    return result.data ? { status: 200, state: { kind: 'freelancers', freelancers: result.data } } : { status: result.status, state: { kind: 'unavailable', path } };
  }
  const jobMatch = path.match(/^\/jobs\/([^/]+)$/);
  if (jobMatch) {
    const id = jobMatch[1];
    if (!UUID_PATTERN.test(id)) return { status: 404, state: { kind: 'not-found', path } };
    const result = await fetchApi<SeoJobDetail>(`public/job-posts/${encodeURIComponent(id)}`);
    if (result.data) return { status: 200, state: { kind: 'job', job: result.data } };
    return result.status === 404 || result.status === 410 ? { status: result.status, state: { kind: 'not-found', path } } : { status: result.status, state: { kind: 'unavailable', path } };
  }
  const freelancerMatch = path.match(/^\/freelancers\/([^/]+)$/);
  if (freelancerMatch) {
    const id = freelancerMatch[1];
    if (!UUID_PATTERN.test(id)) return { status: 404, state: { kind: 'not-found', path } };
    const result = await fetchApi<SeoFreelancerDetail>(`public/freelancers/${encodeURIComponent(id)}`);
    if (result.data) return { status: 200, state: { kind: 'freelancer', freelancer: result.data } };
    return result.status === 404 || result.status === 410 ? { status: result.status, state: { kind: 'not-found', path } } : { status: result.status, state: { kind: 'unavailable', path } };
  }
  return { status: 404, state: { kind: 'not-found', path } };
};

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
const serializeJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

const renderHead = (state: SeoRouteState): string => {
  const metadata = getSeoMetadata(state);
  const canonical = `${SITE_URL}${metadata.canonicalPath}`;
  const jsonLd = metadata.jsonLd.map(value => `<script type="application/ld+json">${serializeJson(value)}</script>`).join('');
  return `<title>${escapeHtml(metadata.title)}</title><meta name="description" content="${escapeHtml(metadata.description)}"><meta name="robots" content="${metadata.robots}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="website"><meta property="og:locale" content="vi_VN"><meta property="og:site_name" content="GigBridge"><meta property="og:title" content="${escapeHtml(metadata.title)}"><meta property="og:description" content="${escapeHtml(metadata.description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${DEFAULT_OG_IMAGE}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(metadata.title)}"><meta name="twitter:description" content="${escapeHtml(metadata.description)}"><meta name="twitter:image" content="${DEFAULT_OG_IMAGE}">${jsonLd}`;
};

const renderDynamicDocument = (state: SeoRouteState): string => {
  const body = renderToString(<SeoPublicApp state={state} />);
  return `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${renderHead(state)}<style>${styles}</style></head><body><div id="seo-root">${body}</div><script id="seo-state" type="application/json">${serializeJson(state)}</script><script type="module" src="/assets/seo-client.js"></script></body></html>`;
};

export const renderSeoResponse = async (path: string): Promise<SeoHttpResponse> => {
  const result = await stateForPath(path);
  return { status: result.status, html: renderDynamicDocument(result.state) };
};

export const prerenderMarketingDocument = (path: MarketingRoute, template: string): string => {
  const state: SeoRouteState = { kind: 'marketing', route: path };
  const body = renderToString(<SeoPublicApp state={state} />);
  let document = template
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/\s*<meta name="description"[^>]*>/gi, '')
    .replace(/\s*<meta name="robots"[^>]*>/gi, '')
    .replace(/\s*<noscript>[\s\S]*?fonts\.(?:googleapis|gstatic)\.com[\s\S]*?<\/noscript>/gi, '')
    .replace(/\s*<link[^>]*fonts\.(?:googleapis|gstatic|cdnfonts)\.com[^>]*>/gi, '')
    .replace('</head>', `${renderHead(state)}</head>`);
  document = document.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  return document;
};

const escapeXml = (value: string): string => escapeHtml(value);

export const renderSitemapXml = async (): Promise<{ readonly status: number; readonly xml: string }> => {
  const result = await fetchApi<SeoSitemapResources>('seo/sitemap-resources');
  if (!result.data) return { status: result.status, xml: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>' };
  const staticPaths = [...MARKETING_ROUTES, '/jobs', '/freelancers'];
  const staticEntries = staticPaths.map(path => `<url><loc>${escapeXml(`${SITE_URL}${path}`)}</loc></url>`);
  const jobEntries = result.data.jobs.map(entry => `<url><loc>${escapeXml(`${SITE_URL}/jobs/${entry.id}`)}</loc><lastmod>${escapeXml(entry.lastModified)}</lastmod></url>`);
  const freelancerEntries = result.data.freelancers.map(entry => `<url><loc>${escapeXml(`${SITE_URL}/freelancers/${entry.id}`)}</loc><lastmod>${escapeXml(entry.lastModified)}</lastmod></url>`);
  return { status: 200, xml: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticEntries, ...jobEntries, ...freelancerEntries].join('')}</urlset>` };
};
