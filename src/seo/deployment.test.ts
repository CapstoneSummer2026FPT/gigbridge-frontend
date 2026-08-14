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
    expect(robots).toContain('Allow: /');
    expect(robots).not.toContain('Disallow:');
  });

  it('routes legacy URLs, www canonicalization, SSR, and SPA fallback in order', () => {
    const config = JSON.parse(
      readFileSync('vercel.json', 'utf8'),
    ) as { readonly rewrites: ReadonlyArray<{ readonly source: string; readonly destination: string }> };

    expect(config.rewrites.slice(0, 3)).toEqual([
      expect.objectContaining({ source: '/:path*', destination: '/api/redirect?target=https://gigbridge.id.vn/:path*' }),
      { source: '/jobs/browse', destination: '/api/redirect?target=/jobs' },
      { source: '/profile/freelancer/:id', destination: '/api/redirect?target=/freelancers/:id' },
    ]);
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
