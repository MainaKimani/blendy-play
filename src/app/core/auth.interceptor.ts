import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ConfigService } from './config.service';

const NO_AUTH = [
  '/auth/login', '/auth/refresh', '/plans', '/terms',
  '/auth/password-reset', '/auth/password-reset/check', '/auth/password-reset/confirm',
];

/** Adds the bearer token to backend calls and retries once after a refresh. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const config = inject(ConfigService);
  // Exact paths: "/dashboard/plans" needs the token although it ends like "/plans".
  const path = req.url.slice(config.apiBase.length).split('?')[0];
  if (!req.url.startsWith(config.apiBase) || NO_AUTH.includes(path)) {
    return next(req);
  }
  const withToken = (r: HttpRequest<unknown>) =>
    auth.accessToken ? r.clone({ setHeaders: { Authorization: `Bearer ${auth.accessToken}` } }) : r;

  return next(withToken(req)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      return from(auth.refreshAccess()).pipe(
        switchMap((ok) => {
          if (!ok) {
            auth.signOut();
            return throwError(() => err);
          }
          return next(withToken(req));
        }),
      );
    }),
  );
};
