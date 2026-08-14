import type { IncomingMessage, ServerResponse } from 'node:http';
import { renderSeoResponse } from '../src/seo/server';

interface SeoRequest extends IncomingMessage {
  readonly query?: Readonly<Record<string, string | readonly string[]>>;
}

const requestedPath = (request: SeoRequest): string => {
  const value = request.query?.path;
  if (Array.isArray(value)) return value[0] ?? '/';
  return typeof value === 'string' ? value : '/';
};

export default async function handler(request: SeoRequest, response: ServerResponse): Promise<void> {
  const path = requestedPath(request);
  const result = await renderSeoResponse(path);
  const isPublicListing = path === '/jobs' || path === '/freelancers';
  response.statusCode = result.status;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader(
    'Cache-Control',
    result.status === 200 && isPublicListing
      ? 'public, s-maxage=60, stale-while-revalidate=300'
      : 'no-store',
  );
  if (result.status !== 200) response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  response.end(result.html);
}
