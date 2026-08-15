export const MAX_MILESTONE_FILES = 5;
export const MAX_MILESTONE_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_MILESTONE_BATCH_BYTES = 100 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.json', '.zip', '.rar', '.7z', '.tar', '.gz',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.mp4', '.webm',
]);

export const MILESTONE_FILE_ACCEPT = [...ALLOWED_EXTENSIONS].join(',');

export type MilestoneFileValidationError =
  | 'empty'
  | 'too-large'
  | 'too-many'
  | 'duplicate'
  | 'total-too-large'
  | 'unsupported';

export interface MilestoneSubmissionPayload {
  description?: string;
  files: readonly File[];
}

export interface MilestoneFileValidationResult {
  error?: MilestoneFileValidationError;
  files: readonly File[];
}

const normalizeFileName = (fileName: string): string => {
  const normalizedPath = fileName.normalize('NFC').trim().replace(/\\/g, '/');
  const baseName = normalizedPath.slice(normalizedPath.lastIndexOf('/') + 1);
  return baseName
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_')
    .replace(/\.+$/g, '')
    .toLowerCase();
};

const getExtension = (fileName: string): string => {
  const extensionStart = fileName.lastIndexOf('.');
  return extensionStart >= 0 ? fileName.slice(extensionStart).toLowerCase() : '';
};

export const getMilestoneBatchSize = (files: readonly File[]): number =>
  files.reduce((total, file) => total + file.size, 0);

export const addMilestoneFile = (
  currentFiles: readonly File[],
  file: File,
): MilestoneFileValidationResult => {
  if (currentFiles.length >= MAX_MILESTONE_FILES) {
    return { files: currentFiles, error: 'too-many' };
  }
  if (file.size <= 0) {
    return { files: currentFiles, error: 'empty' };
  }
  if (file.size > MAX_MILESTONE_FILE_BYTES) {
    return { files: currentFiles, error: 'too-large' };
  }
  if (!ALLOWED_EXTENSIONS.has(getExtension(file.name))) {
    return { files: currentFiles, error: 'unsupported' };
  }

  const normalizedName = normalizeFileName(file.name);
  if (currentFiles.some(current => normalizeFileName(current.name) === normalizedName)) {
    return { files: currentFiles, error: 'duplicate' };
  }
  if (getMilestoneBatchSize(currentFiles) + file.size > MAX_MILESTONE_BATCH_BYTES) {
    return { files: currentFiles, error: 'total-too-large' };
  }

  return { files: [...currentFiles, file] };
};

export const buildMilestoneSubmissionFormData = (
  payload: MilestoneSubmissionPayload,
): FormData => {
  const formData = new FormData();
  const description = payload.description?.trim();
  if (description) {
    formData.append('description', description);
  }
  payload.files.forEach(file => formData.append('files', file));
  return formData;
};
