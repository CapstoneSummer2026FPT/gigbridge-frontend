import { describe, expect, it } from 'vitest';
import { getSeoMetadata, SITE_URL } from './metadata';
import type { SeoJobDetail } from './types';

const job: SeoJobDetail = {
  jobPostsId: '018f4ec7-a17c-7c19-9a1f-9be774a4d001',
  title: 'Thiết kế giao diện thương mại điện tử',
  description: '<p>Xây dựng trải nghiệm mua sắm thân thiện.</p>',
  fullName: 'Công ty GigBridge',
  clientFullName: 'Công ty GigBridge',
  location: 'Ho Chi Minh City',
  endDate: '2026-09-30T00:00:00Z',
  createdAt: '2026-08-14T00:00:00Z',
};

describe('SEO metadata registry', () => {
  it('creates canonical job metadata and complete JobPosting structured data', () => {
    const metadata = getSeoMetadata({ kind: 'job', job });

    expect(metadata.title).toBe(`${job.title} | Việc làm freelance | GigBridge`);
    expect(`${SITE_URL}${metadata.canonicalPath}`).toBe(
      `${SITE_URL}/jobs/${job.jobPostsId}`,
    );
    expect(metadata.robots).toBe('index, follow');
    expect(metadata.jsonLd).toContainEqual(
      expect.objectContaining({
        '@type': 'JobPosting',
        title: job.title,
        description: 'Xây dựng trải nghiệm mua sắm thân thiện.',
        datePosted: job.createdAt,
        validThrough: job.endDate,
      }),
    );
  });

  it('marks missing and unavailable resources as noindex', () => {
    expect(getSeoMetadata({ kind: 'not-found', path: '/jobs/missing' }).robots)
      .toBe('noindex, nofollow');
    expect(getSeoMetadata({ kind: 'unavailable', path: '/jobs' }).robots)
      .toBe('noindex, nofollow');
  });

  it('never copies query parameters into a canonical URL', () => {
    const metadata = getSeoMetadata({ kind: 'jobs', jobs: [] });

    expect(metadata.canonicalPath).toBe('/jobs');
    expect(metadata.canonicalPath).not.toContain('?');
  });
});
