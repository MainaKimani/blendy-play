import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/errors';

/**
 * One sign-in for everyone, at /signin and at /admin. The admin lands on the
 * dashboard; every other account lands on its own account page.
 */
@Component({
  selector: 'bp-signin',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="wrap">
      <a class="brand" routerLink="/" aria-label="Blendy Play home">
        <img src="brand/mark.png" alt="" width="84" height="84">
        <span class="neon-text">Blendy Play</span>
      </a>
      <form class="panel card" (ngSubmit)="submit()" novalidate>
        <h1>{{ admin ? 'Admin sign-in' : 'Sign in' }}</h1>
        <p class="sub">
          @if (admin) {
            For the Blendy Play admin. Customers can sign in here too and will see their own account.
          } @else {
            Use the email and password of your Blendy Play account.
          }
        </p>
        <label class="field">
          <span>Email</span>
          <input class="input" type="email" name="email" autocomplete="email" required [(ngModel)]="email">
        </label>
        <label class="field">
          <span>Password</span>
          <input class="input" type="password" name="password" autocomplete="current-password" required [(ngModel)]="password">
        </label>
        @if (error()) {
          <p class="form-err" role="alert">{{ error() }}</p>
        }
        <button class="btn" type="submit" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>
        <p class="note">No account yet? Create one in the Blendy Play app, then sign in here.</p>
      </form>
    </main>
  `,
  styles: `
    .wrap { min-height: 100dvh; display: grid; place-content: center; justify-items: center; gap: 22px; padding: 32px 16px; }
    .brand { display: grid; justify-items: center; gap: 10px; text-decoration: none; font-size: 22px; font-weight: 700; }
    .brand img { filter: drop-shadow(0 0 22px rgba(224, 64, 251, 0.45)); }
    .card { width: min(420px, calc(100vw - 32px)); padding: 28px 24px; display: grid; gap: 16px; }
    h1 { font-size: 22px; text-align: center; }
    .sub { color: var(--muted); font-size: 14px; text-align: center; }
    .btn { width: 100%; margin-top: 4px; }
    .note { color: var(--muted); font-size: 13px; text-align: center; }
  `,
})
export class SigninComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  next = input<string>();

  admin = !!this.route.snapshot.data['admin'];
  email = '';
  password = '';
  busy = signal(false);
  error = signal('');

  constructor() {
    // Already signed in: go straight to the right place.
    this.auth.ensureMe().then((me) => me && this.land(me.is_admin, me.email_verified));
  }

  async submit(): Promise<void> {
    if (!this.email.trim() || !this.password) {
      this.error.set('Enter your email and password.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const me = await this.auth.signIn(this.email.trim(), this.password);
      this.land(me.is_admin, me.email_verified);
    } catch (err) {
      this.error.set(errorMessage(err, "Couldn't sign you in. Try again."));
    } finally {
      this.busy.set(false);
    }
  }

  private land(isAdmin: boolean, verified: boolean): void {
    if (!verified) {
      this.router.navigateByUrl('/verify');
      return;
    }
    const next = this.next();
    const allowed = next && next.startsWith('/') && !next.startsWith('//') && (isAdmin || !next.startsWith('/dashboard'));
    this.router.navigateByUrl(allowed ? next : isAdmin ? '/dashboard' : '/account');
  }
}
