import type { UploadTransferProgress } from '../../../service/apiService';

export interface MessageAttachmentUploadState {
  phase: 'uploading' | 'processing';
  progress: UploadTransferProgress | null;
}

export type MessageAttachmentUploads = Record<string, MessageAttachmentUploadState>;

export const startMessageAttachmentUpload = (
  current: MessageAttachmentUploads,
  clientMessageId: string,
): MessageAttachmentUploads => ({
  ...current,
  [clientMessageId]: { phase: 'uploading', progress: null },
});

export const updateMessageAttachmentUpload = (
  current: MessageAttachmentUploads,
  clientMessageId: string,
  progress: UploadTransferProgress,
): MessageAttachmentUploads => ({
  ...current,
  [clientMessageId]: {
    phase: progress.percent === 100 ? 'processing' : 'uploading',
    progress,
  },
});

export const removeMessageAttachmentUpload = (
  current: MessageAttachmentUploads,
  clientMessageId: string,
): MessageAttachmentUploads => {
  if (!(clientMessageId in current)) return current;
  const next = { ...current };
  delete next[clientMessageId];
  return next;
};
