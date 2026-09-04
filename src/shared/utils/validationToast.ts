import { toast } from 'sonner';
import type { ApiResponse } from '../../types/common';

type UnknownRecord = Record<string, unknown>;

export interface ValidationToastOptions {
  readonly fallback: string;
  readonly id?: string;
}

const DEFAULT_VALIDATION_TOAST_ID = 'validation-toast';
const VALIDATION_STATUS_CODES = new Set([400, 409, 422]);

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asNonEmptyMessage = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const message = value.trim();
  return message ? message : null;
};

const appendMessages = (value: unknown, messages: string[]): void => {
  const directMessage = asNonEmptyMessage(value);
  if (directMessage) {
    messages.push(directMessage);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item => appendMessages(item, messages));
    return;
  }

  if (!isRecord(value)) return;
  Object.values(value).forEach(item => appendMessages(item, messages));
};

const getNestedValue = (source: UnknownRecord, key: string): unknown => {
  const response = isRecord(source.response) ? source.response : null;
  const data = response && isRecord(response.data) ? response.data : null;
  return source[key] ?? data?.[key];
};

export function extractValidationMessages(source: unknown, fallback: string): readonly string[] {
  const messages: string[] = [];

  if (typeof source === 'string' || Array.isArray(source)) {
    appendMessages(source, messages);
  } else if (isRecord(source)) {
    const errors = getNestedValue(source, 'errors') ?? getNestedValue(source, 'Errors');
    appendMessages(errors, messages);

    if (messages.length === 0) {
      appendMessages(getNestedValue(source, 'message') ?? getNestedValue(source, 'Message'), messages);
    }
  }

  if (messages.length === 0) appendMessages(fallback, messages);
  return [...new Set(messages)];
}

export function isValidationResponse(response: ApiResponse<unknown>): boolean {
  return Boolean(response.errors && Object.keys(response.errors).length > 0)
    || VALIDATION_STATUS_CODES.has(response.statusCode);
}

export function showValidationToast(source: unknown, options: ValidationToastOptions): void {
  const messages = extractValidationMessages(source, options.fallback);
  const [title, ...details] = messages;

  toast.error(title, {
    id: options.id ?? DEFAULT_VALIDATION_TOAST_ID,
    description: details.length > 0 ? details.map(message => `- ${message}`).join('\n') : undefined,
    duration: 8_000,
    className: 'validation-toast',
  });
}
