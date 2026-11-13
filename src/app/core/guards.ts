import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Any signed-in account. */
export const signedInGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const me = await auth.ensureMe();
  return me ? true : router.createUrlTree(['/signin'], { queryParams: { next: state.url } });
};

/** The super-admin only. Anyone else signed in goes to their own account. */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const me = await auth.ensureMe();
  if (!me) return router.createUrlTree(['/admin'], { queryParams: { next: state.url } });
  return me.is_admin ? true : router.createUrlTree(['/account']);
};
