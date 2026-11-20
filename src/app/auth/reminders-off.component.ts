import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';

/**
 * Where "Stop renewal reminders" in a reminder email lands:
 * /reminders-off?token=... No sign-in: the signed token names the account.
 *
 * It asks before turning them off, rather than turning them off as the page
 * opens, because mail scanners open every link in an email and would turn
 * reminders off for people who never clicked.
 */
@Component({
  selector: 'bp-reminders-off',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <a class="brand" routerLink="/" aria-label="Blendy Play home">
        <img src="brand/mark.png" alt="" width="84" height="84">
        <span class="neon-text">Blendy Play</span>
      </a>
      <div class="panel card">
        <h1>Renewal reminders</h1>
        @if (done()) {
          <p class="done" role="status">Renewal reminders are off.</p>
          <p class="sub">We won't email you before or when your plan ends. Receipts and
            security emails still come. To turn reminders back on, sign in and open
            your account.</p>
          <a class="btn" routerLink="/account">Open my account</a>
        } @else if (!token()) {
          <p class="form-err" role="alert">This link is incomplete. Turn reminders off from your account instead.</p>
          <a class="btn" routerLink="/account">Open my account</a>
        } @else {
          <p class="sub">We email you the day before a weekly or monthly plan ends, and when it
            has ended. Stop these reminders?</p>
          @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }
          <button class="btn" type="button" (click)="turnOff()" [disabled]="busy()">
            {{ busy() ? 'Turning off…' : 'Stop renewal reminders' }}
          </button>
          <a class="back" routerLink="/">Keep them</a>
        }
      </div>
    </main>
  `,
  styleUrl: './auth-card.scss',
})
export class RemindersOffComponent {
  private api = inject(ApiService);
  /** From the link's query string. */
  token = input<string>();
  busy = signal(false);
  done = signal(false);
  error = signal('');

  async turnOff(): Promise<void> {
    this.error.set('');
    this.busy.set(true);
    try {
      await this.api.remindersOff(this.token() ?? '');
      this.done.set(true);
    } catch (e) {
      this.error.set(errorMessage(e, "This link isn't valid. Turn reminders off from your account instead."));
    } finally {
      this.busy.set(false);
    }
  }
}
