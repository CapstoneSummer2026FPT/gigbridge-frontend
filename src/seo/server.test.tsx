import { afterEach, describe, expect, it, vi } from 'vitest';
import { prerenderMarketingDocument, renderSeoResponse } from './server';

const template = '<!doctype html><html lang="vi"><head><title>SPA</title><meta name="description" content="spa"><meta name="robots" content="noindex, nofollow"></head><body><div id="root"></div></body></html>';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('SEO server rendering', () => {
  it('prerenders marketing content, metadata, canonical, JSON-LD, and one h1', () => {
    const html = prerenderMarketingDocument('/about', template);

    expect(html).toContain('<html lang="vi">');
    expect(html).toContain('<meta name="robots" content="index, follow">');
    expect(html).toContain('rel="canonical" href="https://gigbridge.id.vn/about"');
    expect(html).toContain('application/ld+json');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).not.toContain('<title>SPA</title>');
  });

  it('returns a real 404 document with noindex before JavaScript runs', async () => {
    const result = await renderSeoResponse('/jobs/not-a-uuid?preview=true');

    expect(result.status).toBe(404);
    expect(result.html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(result.html).toContain('<h1>');
    expect(result.html).not.toContain('<script id="seo-state" type="application/json"><');
  });

  it('builds a canonical sitemap only from approved public API resources', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SEO_API_BASE_URL', 'https://api.gigbridge.id.vn/api/');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          jobs: [{ id: '018f4ec7-a17c-7c19-9a1f-9be774a4d001', lastModified: '2026-08-14T00:00:00Z' }],
          freelancers: [{ id: '018f4ec7-a17c-7c19-9a1f-9be774a4d002', lastModified: '2026-08-13T00:00:00Z' }],
        },
      }),
    }));
    const { renderSitemapXml } = await import('./server');

    const result = await renderSitemapXml();

    expect(result.status).toBe(200);
    expect(result.xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(result.xml).toContain('https://gigbridge.id.vn/jobs/018f4ec7-a17c-7c19-9a1f-9be774a4d001');
    expect(result.xml).toContain('https://gigbridge.id.vn/freelancers/018f4ec7-a17c-7c19-9a1f-9be774a4d002');
    const locations = [...result.xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map(match => match[1]);
    expect(locations.every(location => !location.includes('?'))).toBe(true);
  });
});
