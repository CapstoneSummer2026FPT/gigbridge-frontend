import { describe, expect, it } from 'vitest';
import {
  MAX_MILESTONE_FILE_BYTES,
  addMilestoneFile,
  buildMilestoneSubmissionFormData,
} from './milestoneUpload';

const fileWithSize = (name: string, size: number): File => ({ name, size }) as File;

describe('milestoneUpload', () => {
  it('accepts a file at the 10 MB boundary', () => {
    const file = fileWithSize('deliverable.zip', MAX_MILESTONE_FILE_BYTES);

    const result = addMilestoneFile([], file);

    expect(result.error).toBeUndefined();
    expect(result.files).toEqual([file]);
  });

  it('rejects a file larger than 10 MB before creating the request', () => {
    const file = fileWithSize('deliverable.zip', MAX_MILESTONE_FILE_BYTES + 1);

    const result = addMilestoneFile([], file);

    expect(result.error).toBe('too-large');
    expect(result.files).toEqual([]);
  });

  it('appends every selected file with the repeated files field', () => {
    const first = new File(['first'], 'first.pdf', { type: 'application/pdf' });
    const second = new File(['second'], 'second.zip', { type: 'application/zip' });

    const formData = buildMilestoneSubmissionFormData({
      description: 'Delivery',
      files: [first, second],
    });

    expect(formData.get('description')).toBe('Delivery');
    expect(formData.getAll('files')).toEqual([first, second]);
  });
});
