import { computeChainedDueDates, parseJobDuration } from '../../features/jobs/utils/jobDuration';

const MAX_AMOUNT = 9_999_999_999_999_999.99;

export interface MilestonePlanWorkItem {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  deliverables?: string | null;
  estimatedDuration?: string | null;
  orderIndex: number;
}

export interface MilestonePlanValue {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  amount: number;
  estimatedDuration?: string | null;
  dueDate?: string | null;
  deliverables?: string | null;
  acceptanceCriteria?: string | null;
  orderIndex: number;
  workItems: MilestonePlanWorkItem[];
}

export type MilestonePlanValidationCode =
  | 'milestoneRequired'
  | 'titleRequired'
  | 'amountInvalid'
  | 'durationInvalid'
  | 'deliverablesRequired'
  | 'workItemTitleRequired'
  | 'workItemDescriptionRequired';

export interface MilestonePlanValidationResult {
  valid: boolean;
  errors: Record<string, MilestonePlanValidationCode>;
  firstError?: MilestonePlanValidationCode;
  advancedIndexes: number[];
}

export interface PreparedMilestonePlan<T extends MilestonePlanValue> {
  milestones: T[];
  advancedIndexes: number[];
  generatedWorkItemIdsByMilestoneId: Record<string, string>;
}

const normalizeText = (value?: string | null): string => value?.trim() || '';

export const toDateOnly = (value?: string | null): string | null => {
  const candidate = value?.slice(0, 10);
  return candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
};

export const currentLocalDate = (now = new Date()): string => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeMilestonePlan = <T extends MilestonePlanValue>(
  milestones: readonly T[],
): T[] => milestones.map((milestone, orderIndex) => ({
  ...milestone,
  amount: Math.round((Number(milestone.amount) || 0) * 100) / 100,
  orderIndex,
  workItems: (milestone.workItems || []).map((workItem, workIndex) => ({
    ...workItem,
    orderIndex: workIndex,
  })),
})) as T[];

export const isGeneratedMilestoneWorkItem = (
  item: MilestonePlanWorkItem,
  milestone: MilestonePlanValue,
): boolean =>
  normalizeText(item.title) === normalizeText(milestone.title) &&
  normalizeText(item.description) === normalizeText(milestone.deliverables) &&
  normalizeText(item.deliverables) === normalizeText(milestone.deliverables) &&
  normalizeText(item.estimatedDuration) === normalizeText(milestone.estimatedDuration);

export const prepareMilestonePlanForEditing = <T extends MilestonePlanValue>(
  milestones: readonly T[],
): PreparedMilestonePlan<T> => {
  const advancedIndexes: number[] = [];
  const generatedWorkItemIdsByMilestoneId: Record<string, string> = {};
  const editable = normalizeMilestonePlan(milestones).map((milestone, index) => {
    const workItems = milestone.workItems || [];
    if (workItems.length === 1 && isGeneratedMilestoneWorkItem(workItems[0], milestone)) {
      if (milestone.id && workItems[0].id) {
        generatedWorkItemIdsByMilestoneId[milestone.id] = workItems[0].id;
      }
      return { ...milestone, workItems: [] } as T;
    }
    if (workItems.length > 0) advancedIndexes.push(index);
    return milestone;
  });

  return { milestones: editable, advancedIndexes, generatedWorkItemIdsByMilestoneId };
};

export const resolveMilestonePlan = <T extends MilestonePlanValue>(
  milestones: readonly T[],
  options: {
    anchorDate: string;
    defaultAcceptanceCriteria: string;
    generatedWorkItemIdsByMilestoneId?: Readonly<Record<string, string>>;
  },
): T[] => {
  const ordered = normalizeMilestonePlan(milestones);
  const dueDates = computeChainedDueDates(
    options.anchorDate,
    ordered.map(milestone => milestone.estimatedDuration),
  );

  return ordered.map((milestone, index) => {
    const customWorkItems = milestone.workItems || [];
    const generatedWorkItemId = milestone.id
      ? options.generatedWorkItemIdsByMilestoneId?.[milestone.id]
      : undefined;
    const workItems = (customWorkItems.length > 0 ? customWorkItems : [{
      id: generatedWorkItemId ?? null,
      title: normalizeText(milestone.title),
      description: normalizeText(milestone.deliverables),
      deliverables: normalizeText(milestone.deliverables),
      estimatedDuration: milestone.estimatedDuration,
      orderIndex: 0,
    }]).map((workItem, workIndex) => ({ ...workItem, orderIndex: workIndex }));

    return {
      ...milestone,
      dueDate: dueDates[index],
      acceptanceCriteria: normalizeText(milestone.acceptanceCriteria) || options.defaultAcceptanceCriteria,
      workItems,
    } as T;
  });
};

export const validateMilestonePlan = (
  milestones: readonly MilestonePlanValue[],
): MilestonePlanValidationResult => {
  if (milestones.length === 0) {
    return {
      valid: false,
      errors: {},
      firstError: 'milestoneRequired',
      advancedIndexes: [],
    };
  }

  const errors: Record<string, MilestonePlanValidationCode> = {};
  const advancedIndexes = new Set<number>();

  normalizeMilestonePlan(milestones).forEach((milestone, milestoneIndex) => {
    if (!normalizeText(milestone.title)) errors[`${milestoneIndex}.title`] = 'titleRequired';
    const amount = Number(milestone.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT || Math.round(amount * 100) / 100 !== amount) {
      errors[`${milestoneIndex}.amount`] = 'amountInvalid';
    }
    if (!parseJobDuration(milestone.estimatedDuration).value) {
      errors[`${milestoneIndex}.estimatedDuration`] = 'durationInvalid';
    }
    if (!normalizeText(milestone.deliverables)) {
      errors[`${milestoneIndex}.deliverables`] = 'deliverablesRequired';
    }

    (milestone.workItems || []).forEach((workItem, workIndex) => {
      if (!normalizeText(workItem.title)) {
        errors[`${milestoneIndex}.workItems.${workIndex}.title`] = 'workItemTitleRequired';
        advancedIndexes.add(milestoneIndex);
      }
      if (!normalizeText(workItem.description)) {
        errors[`${milestoneIndex}.workItems.${workIndex}.description`] = 'workItemDescriptionRequired';
        advancedIndexes.add(milestoneIndex);
      }
    });
  });

  const firstError = Object.values(errors)[0];
  return {
    valid: !firstError,
    errors,
    firstError,
    advancedIndexes: [...advancedIndexes],
  };
};

export const calculateMilestonePlanBudget = (
  milestones: readonly MilestonePlanValue[],
): number => Math.round(milestones.reduce(
  (total, milestone) => total + (Number(milestone.amount) || 0),
  0,
) * 100) / 100;
