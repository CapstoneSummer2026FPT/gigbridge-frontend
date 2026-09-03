import {
  MAX_MILESTONE_FILES,
  addMilestoneFile,
  getMilestoneBatchSize,
  type MilestoneFileValidationError,
} from '../../workspace/utils/milestoneUpload';

export { MAX_MILESTONE_FILES, MILESTONE_FILE_ACCEPT } from '../../workspace/utils/milestoneUpload';
export type { MilestoneFileValidationError } from '../../workspace/utils/milestoneUpload';

/** Files and note staged against one work item, before the batch is sent. */
export interface WorkItemDraft {
  files: readonly File[];
  note: string;
}

export type WorkItemDraftMap = Readonly<Record<string, WorkItemDraft>>;

export const emptyDraft = (): WorkItemDraft => ({ files: [], note: '' });

export const getDraft = (drafts: WorkItemDraftMap, workItemId: string): WorkItemDraft =>
  drafts[workItemId] ?? emptyDraft();

/**
 * Adds a file to one work item's draft while enforcing the shared limits across the WHOLE batch.
 *
 * The backend validates every file in one request against `MaxFilesPerBatch`, so counting per work
 * item would let the user assemble a batch the server then rejects after they have already waited
 * through the upload.
 */
export const addFileToDraft = (
  drafts: WorkItemDraftMap,
  workItemId: string,
  file: File,
): { drafts: WorkItemDraftMap; error?: MilestoneFileValidationError } => {
  const current = getDraft(drafts, workItemId);
  const othersFiles = Object.entries(drafts)
    .filter(([id]) => id !== workItemId)
    .flatMap(([, draft]) => draft.files);

  if (othersFiles.length + current.files.length >= MAX_MILESTONE_FILES) {
    return { drafts, error: 'too-many' };
  }

  // Validate against the combined set so per-file, duplicate and total-size rules see the batch.
  const combined = addMilestoneFile([...othersFiles, ...current.files], file);
  if (combined.error) {
    return { drafts, error: combined.error };
  }

  return {
    drafts: { ...drafts, [workItemId]: { ...current, files: [...current.files, file] } },
  };
};

export const removeFileFromDraft = (
  drafts: WorkItemDraftMap,
  workItemId: string,
  fileName: string,
): WorkItemDraftMap => {
  const current = getDraft(drafts, workItemId);
  return {
    ...drafts,
    [workItemId]: { ...current, files: current.files.filter(file => file.name !== fileName) },
  };
};

export const setDraftNote = (
  drafts: WorkItemDraftMap,
  workItemId: string,
  note: string,
): WorkItemDraftMap => ({
  ...drafts,
  [workItemId]: { ...getDraft(drafts, workItemId), note },
});

export const countStagedFiles = (drafts: WorkItemDraftMap): number =>
  Object.values(drafts).reduce((total, draft) => total + draft.files.length, 0);

export const stagedBatchSize = (drafts: WorkItemDraftMap): number =>
  getMilestoneBatchSize(Object.values(drafts).flatMap(draft => draft.files));

/** Work items that have at least one staged file, i.e. the ones a submit would actually send. */
export const submittableWorkItemIds = (drafts: WorkItemDraftMap): string[] =>
  Object.entries(drafts)
    .filter(([, draft]) => draft.files.length > 0)
    .map(([workItemId]) => workItemId);

/**
 * Builds the multipart body the batch endpoint expects: a `submissionBatchId`, an `items` JSON
 * array, and one form field per file whose NAME is the fileKey the matching item references.
 */
export const buildWorkItemSubmissionFormData = (
  drafts: WorkItemDraftMap,
  workItemIds: readonly string[],
  submissionBatchId: string,
): FormData => {
  const formData = new FormData();
  formData.append('submissionBatchId', submissionBatchId);

  let fileIndex = 0;
  const items = workItemIds.map(workItemId => {
    const draft = getDraft(drafts, workItemId);
    const fileKeys: string[] = [];

    draft.files.forEach(file => {
      const key = `file_${fileIndex++}`;
      fileKeys.push(key);
      formData.append(key, file);
    });

    return { workItemId, note: draft.note.trim() || null, fileKeys };
  });

  formData.append('items', JSON.stringify(items));
  return formData;
};

/** Browsers without `crypto.randomUUID` (older Safari, insecure origins) still need a batch id. */
export const createSubmissionBatchId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};
