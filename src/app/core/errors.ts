import { HttpErrorResponse } from '@angular/common/http';

/** The first readable message in a DRF error response. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return "Can't reach Blendy Play. Check your connection and try again.";
    const body = err.error;
    if (body && typeof body === 'object') {
      if (typeof body.detail === 'string') return body.detail;
      for (const value of Object.values(body)) {
        if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
        if (typeof value === 'string') return value;
      }
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** Field-level messages from a DRF 400, keyed by field name. */
export function fieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (err instanceof HttpErrorResponse && err.status === 400 && err.error && typeof err.error === 'object') {
    for (const [k, v] of Object.entries(err.error)) {
      if (Array.isArray(v) && typeof v[0] === 'string') out[k] = v[0];
    }
  }
  return out;
}
