import { describe, expect, it } from 'vitest';
import { normalizeMilestoneAttachment } from './GET';

describe('contract GET response normalization', () => {
  it('normalizes PascalCase milestone attachment payloads', () => {
    const attachment = normalizeMilestoneAttachment({
      MilestoneAttachmentsId: 'attachment-1',
      MilestonesId: 'milestone-1',
      FileName: 'final-deliverable.zip',
      FileUrl: 'https://example.com/final-deliverable.zip',
      FileSize: 12345,
      SourceType: 0,
      MimeType: 'application/zip',
      UploadedByUserId: 'user-1',
      CreatedAt: '2026-07-02T01:00:00.000Z',
    });

    expect(attachment).toEqual({
      id: 'attachment-1',
      milestone_id: 'milestone-1',
      file_name: 'final-deliverable.zip',
      file_url: 'https://example.com/final-deliverable.zip',
      file_size: 12345,
      source_type: 0,
      mime_type: 'application/zip',
      uploaded_by_user_id: 'user-1',
      created_at: '2026-07-02T01:00:00.000Z',
    });
  });
});
