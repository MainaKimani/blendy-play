import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage, fieldErrors } from '../core/errors';
import { PasswordInputComponent } from '../shared/password-input.component';

/**
 * Where the reset email's link lands: /reset-password?token=...
 * Checks the link first, then asks for the new password twice.
 */
@Component({
  selector: 'bp-reset-password',
  imports: [FormsModule, RouterLink, PasswordInputComponent],
  template: `
    <main class="wrap">
      <a class="brand" routerLink="/" aria-label="Blendy Play home">
        <img src="brand/mark.png" alt="" width="84" height="84">
        <span class="neon-text">Blendy Play</span>
      </a>
      <div class="panel card">
        <h1>Choose a new password</h1>
        @switch (state()) {
          @case ('checking') {
            <div class="spinner" aria-label="Checking the link"></div>
          }
          @case ('bad') {
            <p class="form-err" role="alert">{{ error() }}</p>
            <a class="btn" routerLink="/forgot-password">Send a new link</a>
          }
          @case ('done') {
            <p class="done" role="status">{{ done() }}</p>
            <p class="sub">Use it to sign in on the website or in the Blendy Play app.</p>
            <a class="btn" routerLink="/signin">Sign in</a>
          }
          @default {
            <form class="card-form" (ngSubmit)="submit()" novalidate>
              <p class="sub">For <strong>{{ account() }}</strong></p>
              <label class="field">
                <span>New password</span>
                <bp-password-input name="new" autocomplete="new-password" describedBy="new-hint" [(ngModel)]="password" />
                <span class="hint" id="new-hint">At least 6 characters, and not all numbers.</span>
                @if (fieldError()) { <span class="err">{{ fieldError() }}</span> }
              </label>
              <label class="field">
                <span>Confirm new password</span>
                <bp-password-input name="confirm" autocomplete="new-password" [(ngModel)]="confirm" />
              </label>
              @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }
              <button class="btn" type="submit" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Change password' }}</button>
            </form>
          }
        }
      </div>
    </main>
  `,
  styleUrl: './auth-card.scss',
  styles: `.card-form { display: grid; gap: 16px; } .spinner { margin: 12px auto; }`,
})
export class ResetPasswordComponent implements OnInit {
  private api = inject(ApiService);
  private location = inject(Location);
  /** From ?token= in the emailed link. */
  token = input<string>();
  private resetToken = '';

  state = signal<'checking' | 'ready' | 'bad' | 'done'>('checking');
  account = signal('');
  password = '';
  confirm = '';
  busy = signal(false);
  error = signal('');
  fieldError = signal('');
  done = signal('');

  async ngOnInit(): Promise<void> {
    const token = this.token();
    // Keep the token in memory only and drop it from the address bar, so it
    // doesn't linger in history or show on a shared screen.
    this.resetToken = token ?? '';
    this.location.replaceState('/reset-password');
    if (!token) {
      this.fail('This reset link is incomplete. Open the link from the email again, or ask for a new one.');
      return;
    }
    try {
      const r = await this.api.checkReset(token);
      this.account.set(r.email);
      this.state.set('ready');
    } catch (e) {
      this.fail(errorMessage(e, "This reset link isn't valid. Ask for a new one."));
    }
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.fieldError.set('');
    if (!this.password || !this.confirm) {
      this.error.set('Enter your new password twice.');
      return;
    }
    if (this.password !== this.confirm) {
      this.error.set("The two passwords don't match.");
      return;
    }
    this.busy.set(true);
    try {
      const r = await this.api.confirmReset(this.resetToken, this.password);
      this.done.set(r.detail);
      this.state.set('done');
    } catch (e) {
      const field = fieldErrors(e)['new_password'];
      if (field) this.fieldError.set(field);
      else if (e instanceof HttpErrorResponse && e.error?.reason) this.fail(errorMessage(e));
      else this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  private fail(message: string): void {
    this.error.set(message);
    this.state.set('bad');
  }
}
