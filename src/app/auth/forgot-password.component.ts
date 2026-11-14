import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';

/** Ask for a reset link. The answer never says whether the email has an account. */
@Component({
  selector: 'bp-forgot-password',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="wrap">
      <a class="brand" routerLink="/" aria-label="Blendy Play home">
        <img src="brand/mark.png" alt="" width="84" height="84">
        <span class="neon-text">Blendy Play</span>
      </a>
      <form class="panel card" (ngSubmit)="submit()" novalidate>
        <h1>Reset your password</h1>
        @if (sent()) {
          <p class="sub" role="status">{{ sent() }}</p>
          <p class="sub">Check your inbox, and your spam folder if it isn't there.</p>
        } @else {
          <p class="sub">Enter the email you signed up with and we'll send you a link to choose a new password.</p>
          <label class="field">
            <span>Email</span>
            <input class="input" type="email" name="email" autocomplete="email" required [(ngModel)]="address">
          </label>
          @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }
          <button class="btn" type="submit" [disabled]="busy()">{{ busy() ? 'Sending…' : 'Send reset link' }}</button>
        }
        <a class="back" routerLink="/signin">Back to sign in</a>
      </form>
    </main>
  `,
  styleUrl: './auth-card.scss',
})
export class ForgotPasswordComponent implements OnInit {
  private api = inject(ApiService);
  /** Prefilled from the sign-in page's email field. */
  email = input<string>();
  address = '';
  busy = signal(false);
  error = signal('');
  sent = signal('');

  ngOnInit(): void {
    this.address = this.email() ?? '';
  }

  async submit(): Promise<void> {
    this.error.set('');
    if (!this.address.trim()) {
      this.error.set('Enter your email.');
      return;
    }
    this.busy.set(true);
    try {
      const r = await this.api.requestReset(this.address.trim());
      this.sent.set(r.detail);
    } catch (e) {
      this.error.set(errorMessage(e, 'Enter a valid email.'));
    } finally {
      this.busy.set(false);
    }
  }
}
