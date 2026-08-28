import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

const parseSampleRate = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
};

const removeSensitiveRequestData = (event: Sentry.ErrorEvent): Sentry.ErrorEvent => {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.headers;
    delete event.request.query_string;

    if (event.request.url) {
      try {
        const url = new URL(event.request.url);
        event.request.url = `${url.origin}${url.pathname}`;
      } catch {
        // Keep Sentry's original value when it is not an absolute URL.
      }
    }
  }

  // User identity can be attached explicitly later after a privacy review.
  delete event.user;
  return event;
};

export const initializeSentry = (): boolean => {
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE),
    beforeSend: removeSensitiveRequestData,
  });

  return true;
};

export { Sentry };
