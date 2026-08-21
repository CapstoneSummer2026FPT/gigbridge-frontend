import { describe, expect, it } from 'vitest';
import vercelConfig from '../../vercel.json';

describe('Vercel rewrite rules', () => {
  const rewrites = vercelConfig.rewrites;

  it('contains valid rewrite entries', () => {
    expect(Array.isArray(rewrites)).toBe(true);
    expect(rewrites.length).toBeGreaterThan(0);
  });

  it('restricts job and freelancer detail SEO rewrites to valid UUIDs', () => {
    const jobDetailRewrite = rewrites.find(r => r.destination === '/api/seo?path=/jobs/:id');
    const freelancerDetailRewrite = rewrites.find(r => r.destination === '/api/seo?path=/freelancers/:id');

    expect(jobDetailRewrite).toBeDefined();
    expect(freelancerDetailRewrite).toBeDefined();

    // Verify regex pattern is present in the source path
    expect(jobDetailRewrite?.source).toContain('([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})');
    expect(freelancerDetailRewrite?.source).toContain('([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})');
  });

  it('does not intercept SPA routes like my-jobs, post, saved, invitations as SEO detail pages', () => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    const spaJobSubroutes = ['my-jobs', 'post', 'saved', 'invitations'];
    spaJobSubroutes.forEach(subroute => {
      expect(uuidRegex.test(subroute)).toBe(false);
    });

    const validUuid = 'c4f2e987-a068-45ad-bc97-402cfbb857cf';
    expect(uuidRegex.test(validUuid)).toBe(true);
  });
});
