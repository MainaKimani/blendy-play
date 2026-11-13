import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errorMessage, fieldErrors } from '../core/errors';

@Component({
  selector: 'bp-security',
  imports: [FormsModule],
  template: `
    <form class="panel block" (ngSubmit)="changePassword()" novalidate>
      <h2>Change password</h2>
      <div class="grid">
        <label class="field">
          <span>Current password</span>
          <input class="input" type="password" name="current" autocomplete="current-password" [(ngModel)]="pw.current">
          @if (pwErrors()['current_password']) { <span class="err">{{ pwErrors()['current_password'] }}</span> }
        </label>
        <label class="field">
          <span>New password</span>
          <input class="input" type="password" name="next" autocomplete="new-password" [(ngModel)]="pw.next">
          @if (pwErrors()['new_password']) { <span class="err">{{ pwErrors()['new_password'] }}</span> }
        </label>
      </div>
      <p class="hint">At least 8 characters, not all numbers, and not too close to your email.</p>
      <div class="row">
        <button class="btn" type="submit" [disabled]="pwBusy()">{{ pwBusy() ? 'Changing…' : 'Change password' }}</button>
        @if (pwDone()) { <span class="form-ok" role="status">Password changed.</span> }
        @if (pwError()) { <span class="form-err" role="alert">{{ pwError() }}</span> }
      </div>
    </form>

    <section class="panel block danger-zone">
      <h2>Delete account</h2>
      <p class="muted">
        This removes your name, email, phone number and saved CineJoy number, and signs you out everywhere.
        Any time left on your plan is lost. Records of past payments are kept without your details,
        because we're required to keep financial records.
      </p>
      @if (!confirming()) {
        <div><button class="btn danger" type="button" (click)="confirming.set(true)">Delete my account</button></div>
      } @else {
        <form class="confirm" (ngSubmit)="deleteAccount()" novalidate>
          <label class="field">
            <span>Enter your password to delete your account</span>
            <input class="input" type="password" name="delpw" autocomplete="current-password" [(ngModel)]="delPassword">
          </label>
          @if (delError()) { <span class="form-err" role="alert">{{ delError() }}</span> }
          <div class="row">
            <button class="btn danger" type="submit" [disabled]="delBusy() || !delPassword">
              {{ delBusy() ? 'Deleting…' : 'Delete my account' }}
            </button>
            <button class="btn ghost" type="button" (click)="confirming.set(false); delPassword = ''">Keep my account</button>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    :host { display: grid; gap: 18px; }
    .block { padding: 24px; display: grid; gap: 14px; }
    h2 { font-size: 18px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .hint, .muted { color: var(--muted); font-size: 14px; max-width: 66ch; }
    .row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    .danger-zone { border-color: rgba(255, 61, 87, 0.3); }
    .confirm { display: grid; gap: 12px; max-width: 420px; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class SecurityComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  pw = { current: '', next: '' };
  pwBusy = signal(false);
  pwDone = signal(false);
  pwError = signal('');
  pwErrors = signal<Record<string, string>>({});

  confirming = signal(false);
  delPassword = '';
  delBusy = signal(false);
  delError = signal('');

  async changePassword(): Promise<void> {
    this.pwDone.set(false);
    this.pwError.set('');
    this.pwErrors.set({});
    if (!this.pw.current || !this.pw.next) {
      this.pwError.set('Enter your current password and a new one.');
      return;
    }
    this.pwBusy.set(true);
    try {
      await this.api.changePassword(this.pw.current, this.pw.next);
      this.pw = { current: '', next: '' };
      this.pwDone.set(true);
    } catch (e) {
      this.pwErrors.set(fieldErrors(e));
      if (!Object.keys(this.pwErrors()).length) this.pwError.set(errorMessage(e));
    } finally {
      this.pwBusy.set(false);
    }
  }

  async deleteAccount(): Promise<void> {
    this.delBusy.set(true);
    this.delError.set('');
    try {
      await this.api.deleteAccount(this.delPassword);
      this.auth.clear();
      this.router.navigateByUrl('/');
    } catch (e) {
      const f = fieldErrors(e);
      this.delError.set(f['password'] ?? errorMessage(e));
    } finally {
      this.delBusy.set(false);
    }
  }
}
