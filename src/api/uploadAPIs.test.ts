import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  upload: vi.fn(),
  post: vi.fn(),
  get: vi.fn(),
}));

vi.mock('../service/apiService', () => ({
  apiService: apiMocks,
}));

import { contractPostAPI } from './contractAPI/POST';
import { messagePostAPI } from './messageAPI/POST';

describe('multipart upload APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.upload.mockResolvedValue({ success: true, statusCode: 200, data: {} });
  });

  it('routes milestone submissions through apiService.upload with progress options', async () => {
    const formData = new FormData();
    const options = { onUploadProgress: vi.fn() };

    await contractPostAPI.submitMilestone('contract-1', 'milestone-1', formData, options);

    expect(apiMocks.upload).toHaveBeenCalledWith(
      'contracts/contract-1/milestones/milestone-1/submit',
      formData,
      options,
    );
  });

  it('routes product handoffs through apiService.upload', async () => {
    const formData = new FormData();
    const options = { onUploadProgress: vi.fn() };

    await contractPostAPI.submitProductHandoff('contract-1', formData, options);

    expect(apiMocks.upload).toHaveBeenCalledWith(
      'contracts/contract-1/product-handoffs',
      formData,
      options,
    );
  });

  it('builds one multipart chat request and forwards progress options', async () => {
    const options = { onUploadProgress: vi.fn() };
    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.zip', { type: 'application/zip' }),
    ];

    await messagePostAPI.sendMessageWithAttachments(
      'conversation-1',
      'client-message-1',
      'Files attached',
      files,
      options,
    );

    const [endpoint, formData, forwardedOptions] = apiMocks.upload.mock.calls[0];
    expect(endpoint).toBe('messages/attachments');
    expect(forwardedOptions).toBe(options);
    expect(formData.get('conversationId')).toBe('conversation-1');
    expect(formData.get('clientMessageId')).toBe('client-message-1');
    expect(formData.getAll('attachments')).toEqual(files);
  });
});
