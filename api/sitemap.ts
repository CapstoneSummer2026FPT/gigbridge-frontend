import type { IncomingMessage, ServerResponse } from 'node:http';
import { renderSitemapXml } from '../src/seo/server.js';

export default async function handler(_request: IncomingMessage, response: ServerResponse): Promise<void> {
  const result = await renderSitemapXml();
  response.statusCode = result.status;
  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  response.end(result.xml);
}
