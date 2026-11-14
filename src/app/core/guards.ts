import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Any signed-in account that has confirmed its email. */
export const signedInGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const me = await auth.ensureMe();
  if (!me) return router.createUrlTree(['/signin'], { queryParams: { next: state.url } });
  return me.email_verified ? true : router.createUrlTree(['/verify']);
};

/** Signed in but not yet verified: the only place such an account can go. */
export const unverifiedGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const me = await auth.ensureMe();
  if (!me) return router.createUrlTree(['/signin']);
  return me.email_verified ? router.createUrlTree([me.is_admin ? '/dashboard' : '/account']) : true;
};

/** The super-admin only. Anyone else signed in goes to their own account. */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const me = await auth.ensureMe();
  if (!me) return router.createUrlTree(['/admin'], { queryParams: { next: state.url } });
  return me.is_admin ? true : router.createUrlTree(['/account']);
};
