import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService, homePath } from '../core/auth.service';
import { errorMessage } from '../core/errors';

/**
 * Confirm the email address with the 4-digit code the backend sent at
 * registration. Until then the account can't reach /account or pay.
 */
@Component({
  selector: 'bp-verify',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="wrap">
      <a class="brand" routerLink="/" aria-label="Blendy Play home">
        <img src="brand/mark.png" alt="" width="84" height="84">
        <span class="neon-text">Blendy Play</span>
      </a>
      <form class="panel card" (ngSubmit)="submit()" novalidate>
        <h1>Check your email</h1>
        <p class="sub">
          We sent a 4-digit code to <strong>{{ auth.me()?.email }}</strong>. Enter it to finish setting up
          your account.
        </p>
        <label class="field">
          <span class="visually-hidden">4-digit code</span>
          <input class="input code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="4"
                 placeholder="····" [ngModel]="code" (ngModelChange)="onInput($event)" aria-describedby="code-err">
        </label>
        <p class="form-err" id="code-err" role="alert">{{ error() }}</p>
        <button class="btn" type="submit" [disabled]="busy()">{{ busy() ? 'Checking…' : 'Verify email' }}</button>
        @if (sent()) { <p class="form-ok" role="status">{{ sent() }}</p> }
        <div class="links">
          <button type="button" class="link" [disabled]="wait() > 0 || resending()" (click)="resend()">
            {{ wait() > 0 ? 'Send a new code in ' + clock(wait()) : 'Send a new code' }}
          </button>
          <button type="button" class="link" (click)="auth.signOut('/signin')">Use a different email</button>
        </div>
      </form>
    </main>
  `,
  styles: `
    .wrap { min-height: 100dvh; display: grid; place-content: center; justify-items: center; gap: 22px; padding: 32px 16px; }
    .brand { display: grid; justify-items: center; gap: 10px; text-decoration: none; font-size: 22px; font-weight: 700; }
    .brand img { filter: drop-shadow(0 0 22px rgba(224, 64, 251, 0.45)); }
    .card { width: min(420px, calc(100vw - 32px)); padding: 28px 24px; display: grid; gap: 14px; }
    h1 { font-size: 22px; text-align: center; }
    .sub { color: var(--muted); font-size: 14px; text-align: center; }
    .sub strong { color: var(--text); word-break: break-all; }
    .code { text-align: center; font-size: 30px; font-weight: 700; letter-spacing: 0.6em; padding-left: 0.6em; font-variant-numeric: tabular-nums; }
    .form-err { min-height: 18px; text-align: center; }
    .form-ok { text-align: center; }
    .btn { width: 100%; }
    .links { display: grid; justify-items: center; gap: 8px; margin-top: 4px; }
    .link { background: none; border: 0; color: var(--cyan); font: 14px var(--font); cursor: pointer; padding: 4px; }
    .link:disabled { color: var(--muted); cursor: default; }
  `,
})
export class VerifyComponent implements OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  code = '';
  busy = signal(false);
  resending = signal(false);
  error = signal('');
  sent = signal('');
  wait = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  onInput(value: string): void {
    this.code = (value ?? '').replace(/\D/g, '').slice(0, 4);
    if (this.code.length === 4) this.submit();
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.sent.set('');
    if (this.code.length !== 4) {
      this.error.set('Enter the 4-digit code from your email.');
      return;
    }
    this.busy.set(true);
    try {
      const me = await this.api.verifyEmail(this.code);
      this.auth.setMe(me);
      this.router.navigateByUrl(homePath(me));
    } catch (e) {
      this.error.set(errorMessage(e, "That code didn't work. Try again."));
      this.code = '';
    } finally {
      this.busy.set(false);
    }
  }

  async resend(): Promise<void> {
    this.error.set('');
    this.sent.set('');
    this.resending.set(true);
    try {
      const r = await this.api.resendCode();
      this.sent.set(r.detail);
      this.code = '';
      this.countdown(r.retry_after);
    } catch (e) {
      this.error.set(errorMessage(e, "Couldn't send a new code."));
      const retry = e instanceof HttpErrorResponse ? e.error?.retry_after : undefined;
      if (typeof retry === 'number') this.countdown(retry);
    } finally {
      this.resending.set(false);
    }
  }

  clock(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  private countdown(seconds: number): void {
    clearInterval(this.timer);
    this.wait.set(Math.ceil(seconds));
    this.timer = setInterval(() => {
      this.wait.update((n) => Math.max(0, n - 1));
      if (this.wait() === 0) clearInterval(this.timer);
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
