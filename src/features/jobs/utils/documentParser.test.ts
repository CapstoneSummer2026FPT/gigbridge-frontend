import { describe, expect, it } from 'vitest';
import { parseJobDocument, MAX_FILE_SIZE, MAX_CHAR_LIMIT } from './documentParser';

describe('documentParser', () => {
  it('parses plain text (.txt) files accurately', async () => {
    const content = 'Job Title: Senior Backend Developer\nSkills: C#, ASP.NET Core, PostgreSQL\nBudget: 2000 GC';
    const file = new File([content], 'spec.txt', { type: 'text/plain' });

    const result = await parseJobDocument(file);
    expect(result.text).toContain('Senior Backend Developer');
    expect(result.fileName).toBe('spec.txt');
    expect(result.fileType).toBe('TXT');
    expect(result.charCount).toBe(content.length);
    expect(result.isTruncated).toBe(false);
  });

  it('parses markdown (.md) files accurately', async () => {
    const content = '# Project Brief\n## Requirements\n- React\n- TypeScript';
    const file = new File([content], 'README.md', { type: 'text/markdown' });

    const result = await parseJobDocument(file);
    expect(result.text).toContain('# Project Brief');
    expect(result.fileType).toBe('MD');
  });

  it('rejects files larger than 10MB limit', async () => {
    const oversizedFile = {
      name: 'large_archive.zip',
      size: MAX_FILE_SIZE + 100,
    } as File;

    await expect(parseJobDocument(oversizedFile)).rejects.toThrow('FILE_TOO_LARGE');
  });

  it('rejects unsupported file formats', async () => {
    const invalidFile = new File(['binary data'], 'program.exe', { type: 'application/x-msdownload' });

    await expect(parseJobDocument(invalidFile)).rejects.toThrow('UNSUPPORTED_FORMAT');
  });

  it('truncates content exceeding character limit', async () => {
    const longContent = 'A'.repeat(MAX_CHAR_LIMIT + 500);
    const file = new File([longContent], 'long_doc.txt', { type: 'text/plain' });

    const result = await parseJobDocument(file);
    expect(result.charCount).toBe(MAX_CHAR_LIMIT);
    expect(result.isTruncated).toBe(true);
  });
});
