import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errorMessage, fieldErrors } from '../core/errors';
import { day, money, phone } from '../core/format';
import { MySubscription } from '../core/models';
import { subscriptionPill } from '../shared/status';

@Component({
  selector: 'bp-details',
  imports: [FormsModule],
  template: `
    <section class="panel block">
      <h2>Subscription</h2>
      @if (sub(); as s) {
        <div class="sub-row">
          <span class="pill {{ pill(s.status === 'ACTIVE' && !s.active ? 'EXPIRED' : s.status).tone }}">
            {{ pill(s.status === 'ACTIVE' && !s.active ? 'EXPIRED' : s.status).text }}
          </span>
          @if (s.plan) {
            <span>{{ s.plan.name }}, {{ money(s.plan.price, s.plan.currency) }}</span>
          }
        </div>
        <p class="muted">
          @if (s.active) {
            Your plan runs until {{ day(s.current_period_end) }}. To add more time, choose a plan in the app.
          } @else if (s.current_period_end) {
            Your plan ended on {{ day(s.current_period_end) }}. Choose a plan in the app to keep watching.
          } @else {
            You don't have a plan yet. Choose one in the Blendy Play app and pay with M-Pesa.
          }
        </p>
      } @else if (subError()) {
        <p class="form-err">{{ subError() }}</p>
      } @else {
        <div class="spinner"></div>
      }
    </section>

    <form class="panel block" (ngSubmit)="save()" novalidate>
      <h2>Your details</h2>
      <div class="grid">
        <label class="field">
          <span>First name</span>
          <input class="input" name="first_name" autocomplete="given-name" [(ngModel)]="form.first_name">
          @if (errors()['first_name']) { <span class="err">{{ errors()['first_name'] }}</span> }
        </label>
        <label class="field">
          <span>Last name</span>
          <input class="input" name="last_name" autocomplete="family-name" [(ngModel)]="form.last_name">
          @if (errors()['last_name']) { <span class="err">{{ errors()['last_name'] }}</span> }
        </label>
        <label class="field">
          <span>Phone number</span>
          <input class="input" name="phone_number" type="tel" autocomplete="tel" placeholder="07XX XXX XXX" [(ngModel)]="form.phone_number">
          @if (errors()['phone_number']) { <span class="err">{{ errors()['phone_number'] }}</span> }
        </label>
        <label class="field">
          <span>Email</span>
          <input class="input" name="email" [value]="auth.me()?.email ?? ''" readonly>
          <span class="hint">Your email can't be changed yet.</span>
        </label>
      </div>
      <div class="row">
        <button class="btn" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save details' }}</button>
        @if (saved()) { <span class="form-ok" role="status">Details saved.</span> }
        @if (error()) { <span class="form-err" role="alert">{{ error() }}</span> }
      </div>
    </form>

    <section class="panel block">
      <h2>CineJoy</h2>
      <p class="muted">
        @if (auth.me()?.has_cinejoy_account) {
          Your CineJoy number ending in {{ auth.me()?.cinejoy_last4 }} is saved in the app.
        } @else {
          No CineJoy number saved. It's optional: in the app, choose "Save my CineJoy number" to keep it safe.
        }
      </p>
    </section>
  `,
  styles: `
    :host { display: grid; gap: 18px; }
    .block { padding: 24px; display: grid; gap: 14px; }
    h2 { font-size: 18px; }
    .sub-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    .muted { color: var(--muted); font-size: 15px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .hint { color: var(--muted); font-size: 12px; }
    .row { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; }
    .spinner { margin: 8px 0; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class DetailsComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  sub = signal<MySubscription | null>(null);
  subError = signal('');
  form = { first_name: '', last_name: '', phone_number: '' };
  saving = signal(false);
  saved = signal(false);
  error = signal('');
  errors = signal<Record<string, string>>({});
  money = money;
  day = day;
  pill = subscriptionPill;

  ngOnInit(): void {
    const me = this.auth.me();
    if (me) this.form = { first_name: me.first_name, last_name: me.last_name, phone_number: phone(me.phone_number).replace('—', '') };
    this.api.mySubscription().then((s) => this.sub.set(s)).catch((e) => this.subError.set(errorMessage(e)));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');
    this.errors.set({});
    try {
      const me = await this.api.updateMe(this.form);
      this.auth.setMe(me);
      this.form.phone_number = me.phone_number ? phone(me.phone_number) : '';
      this.saved.set(true);
    } catch (e) {
      this.errors.set(fieldErrors(e));
      if (!Object.keys(this.errors()).length) this.error.set(errorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }
}
