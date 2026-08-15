import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import redirectHandler from '../../api/redirect';

interface TestRedirectRequest extends IncomingMessage {
  readonly query: Readonly<Record<string, string>>;
}

describe('SEO deployment rules', () => {
  it('keeps private SPA HTML crawlable so search engines can read noindex', () => {
    const html = readFileSync('index.html', 'utf8');
    const robots = readFileSync('public/robots.txt', 'utf8');

    expect(html).toContain('<html lang="vi">');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(html).toContain('rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png"');
    expect(html).not.toContain('/src/imports/');
    expect(readFileSync('public/favicon-96x96.png').byteLength).toBeGreaterThan(0);
    expect(robots).toContain('Allow: /');
    expect(robots).not.toContain('Disallow:');
  });

  it('routes legacy URLs, www canonicalization, SSR, and SPA fallback in order', () => {
    const config = JSON.parse(
      readFileSync('vercel.json', 'utf8'),
    ) as {
      readonly cleanUrls?: boolean;
      readonly functions: Readonly<Record<string, { readonly includeFiles: string }>>;
      readonly rewrites: ReadonlyArray<{ readonly source: string; readonly destination: string }>;
    };

    expect(config.cleanUrls).not.toBe(true);
    expect(config.functions['api/seo.ts']?.includeFiles).toBe('.seo-build/**');
    expect(config.functions['api/sitemap.ts']?.includeFiles).toBe('.seo-build/**');
    expect(config.rewrites.slice(0, 2)).toEqual([
      expect.objectContaining({ source: '/:path*', destination: '/api/redirect?target=https://gigbridge.id.vn/:path*' }),
      { source: '/jobs/browse', destination: '/api/redirect?target=/jobs' },
    ]);
    expect(config.rewrites).not.toContainEqual(
      expect.objectContaining({ source: '/profile/freelancer/:id' }),
    );
    expect(config.rewrites).toContainEqual({ source: '/jobs/:id', destination: '/api/seo?path=/jobs/:id' });
    expect(config.rewrites.at(-1)?.destination).toBe('/spa.html');
  });

  it('returns an exact 301 and rejects external redirect destinations', () => {
    const response = {
      statusCode: 0,
      setHeader: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const request = {
      query: { target: 'https://attacker.example/path' },
    } as unknown as TestRedirectRequest;

    redirectHandler(request, response);

    expect(response.statusCode).toBe(301);
    expect(response.setHeader).toHaveBeenCalledWith('Location', 'https://gigbridge.id.vn');
    expect(response.end).toHaveBeenCalledOnce();
  });
});
