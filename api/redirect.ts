import type { IncomingMessage, ServerResponse } from 'node:http';

interface RedirectRequest extends IncomingMessage {
  readonly query?: Readonly<Record<string, string | readonly string[]>>;
}

const canonicalOrigin = 'https://gigbridge.id.vn';

const firstQueryValue = (value: string | readonly string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? '/';
  return typeof value === 'string' ? value : '/';
};

const safeDestination = (rawTarget: string): string => {
  try {
    const destination = new URL(rawTarget, canonicalOrigin);
    if (destination.origin !== canonicalOrigin) return canonicalOrigin;
    destination.search = '';
    destination.hash = '';
    return destination.toString();
  } catch {
    return canonicalOrigin;
  }
};

export default function handler(request: RedirectRequest, response: ServerResponse): void {
  const destination = safeDestination(firstQueryValue(request.query?.target));
  response.statusCode = 301;
  response.setHeader('Location', destination);
  response.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  response.setHeader('X-Robots-Tag', 'noindex');
  response.end();
}
