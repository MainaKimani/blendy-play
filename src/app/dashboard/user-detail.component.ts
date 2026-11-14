import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage, fieldErrors } from '../core/errors';
import { day, dayTime, money, phone } from '../core/format';
import { AdminPlan, AdminSubscriptionChanges, AdminUser, SubStatus } from '../core/models';
import { paymentPill, subscriptionPill } from '../shared/status';

const NAIROBI = 'Africa/Nairobi';

/** "2026-11-14" in Nairobi, for a date input. */
function dateInput(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: NAIROBI }) : '';
}

@Component({
  selector: 'bp-user-detail',
  imports: [RouterLink, FormsModule],
  template: `
    <a class="back" routerLink="/dashboard/users">All users</a>
    @if (user(); as u) {
      <div class="page-head">
        <div>
          <h1>{{ u.name || u.email }}</h1>
          <p>{{ u.email }}, joined {{ day(u.created_at) }}</p>
        </div>
        <span class="pill {{ statePill(u).tone }}">{{ statePill(u).text }}</span>
      </div>
      <dl class="facts panel">
        <div><dt>Plan</dt><dd>{{ u.subscription.lifetime ? 'Lifetime pass' : (u.subscription.plan ?? '—') }}</dd></div>
        <div><dt>Ends</dt><dd>{{ u.subscription.lifetime ? 'Never' : day(u.subscription.current_period_end) }}</dd></div>
        <div><dt>Phone</dt><dd>{{ phone(u.phone_number) }}</dd></div>
        <div><dt>Paid in total</dt><dd>{{ money(u.total_paid) }}</dd></div>
        <div><dt>Payments</dt><dd>{{ u.payments_count ?? 0 }}</dd></div>
        <div><dt>CineJoy number</dt><dd>{{ u.has_cinejoy_account ? 'Saved' : 'Not saved' }}</dd></div>
        <div><dt>Email</dt><dd>{{ u.email_verified ? 'Confirmed' : 'Not confirmed' }}</dd></div>
        <div><dt>Account</dt><dd>{{ u.is_deleted ? 'Deleted' : u.is_active ? 'Active' : 'Suspended' }}</dd></div>
      </dl>

      @if (u.is_deleted) {
        <p class="panel note">This customer deleted their account. Their details were erased, so there's nothing to edit.</p>
      } @else {
        <div class="editors">
          <form class="panel block" (ngSubmit)="saveDetails()" novalidate>
            <h2>Details</h2>
            <div class="grid">
              <label class="field">
                <span>First name</span>
                <input class="input" name="first_name" [(ngModel)]="details.first_name">
                @if (detailErrors()['first_name']) { <span class="err">{{ detailErrors()['first_name'] }}</span> }
              </label>
              <label class="field">
                <span>Last name</span>
                <input class="input" name="last_name" [(ngModel)]="details.last_name">
                @if (detailErrors()['last_name']) { <span class="err">{{ detailErrors()['last_name'] }}</span> }
              </label>
              <label class="field">
                <span>Email</span>
                <input class="input" name="email" type="email" [(ngModel)]="details.email">
                @if (detailErrors()['email']) { <span class="err">{{ detailErrors()['email'] }}</span> }
              </label>
              <label class="field">
                <span>Phone number</span>
                <input class="input" name="phone_number" type="tel" placeholder="07XX XXX XXX" [(ngModel)]="details.phone_number">
                @if (detailErrors()['phone_number']) { <span class="err">{{ detailErrors()['phone_number'] }}</span> }
              </label>
            </div>
            <label class="check">
              <input type="checkbox" name="email_verified" [(ngModel)]="details.email_verified">
              <span>Email confirmed <small>Unticked, they must enter an emailed code before they can pay.</small></span>
            </label>
            <label class="check">
              <input type="checkbox" name="suspended" [(ngModel)]="details.suspended">
              <span>Suspended <small>They're signed out and can't sign in until this is unticked.</small></span>
            </label>
            <div class="row">
              <button class="btn" type="submit" [disabled]="savingDetails()">{{ savingDetails() ? 'Saving…' : 'Save details' }}</button>
              @if (detailsOk()) { <span class="form-ok" role="status">{{ detailsOk() }}</span> }
              @if (detailsErr()) { <span class="form-err" role="alert">{{ detailsErr() }}</span> }
            </div>
          </form>

          <section class="panel block">
            <h2>Subscription</h2>
            @if (u.subscription.lifetime) {
              <p class="muted">
                Lifetime pass: active with no end date. The customer sees an active subscription with no end
                date; it isn't offered or mentioned anywhere else.
              </p>
              <div class="row">
                <button class="btn danger small" type="button" [disabled]="savingSub()" (click)="setLifetime(false)">Remove lifetime pass</button>
              </div>
            } @else {
              <div class="add-days">
                <label class="field">
                  <span>Add days</span>
                  <input class="input" name="add_days" type="number" min="1" max="366" [(ngModel)]="addDays">
                </label>
                <button class="btn small" type="button" [disabled]="savingSub() || !addDays" (click)="extend()">Add {{ addDays || '' }} {{ addDays === 1 ? 'day' : 'days' }}</button>
              </div>
              <p class="hint">Adds to the time left, or counts from today if it has ended. No payment is recorded.</p>

              <form class="grid" (ngSubmit)="saveSubscription()" novalidate>
                <label class="field">
                  <span>Plan</span>
                  <select class="input" name="plan" [(ngModel)]="sub.plan">
                    <option [ngValue]="null">No plan</option>
                    @for (p of plans(); track p.id) {
                      <option [ngValue]="p.code">{{ p.name }}, {{ money(p.price, p.currency) }}{{ p.is_active ? '' : ' (hidden)' }}</option>
                    }
                  </select>
                </label>
                <label class="field">
                  <span>Status</span>
                  <select class="input" name="status" [(ngModel)]="sub.status">
                    @for (s of statuses; track s.value) { <option [ngValue]="s.value">{{ s.label }}</option> }
                  </select>
                </label>
                <label class="field">
                  <span>Ends (end of the day, Nairobi time)</span>
                  <input class="input" name="end" type="date" [(ngModel)]="sub.end">
                  @if (subErrors()['current_period_end']) { <span class="err">{{ subErrors()['current_period_end'] }}</span> }
                </label>
                <div class="row full">
                  <button class="btn ghost small" type="submit" [disabled]="savingSub()">Save subscription</button>
                </div>
              </form>

              <div class="lifetime">
                <button class="btn ghost small" type="button" [disabled]="savingSub()" (click)="setLifetime(true)">Give lifetime pass</button>
                <span class="hint">Free and never ends. Only you can give it; it isn't shown anywhere else.</span>
              </div>
            }
            @if (subOk()) { <p class="form-ok" role="status">{{ subOk() }}</p> }
            @if (subErr()) { <p class="form-err" role="alert">{{ subErr() }}</p> }
          </section>
        </div>
      }

      <h2>Payments</h2>
      <div class="dt-wrap">
        @if (u.payments?.length) {
          <table class="dt">
            <thead>
              <tr><th scope="col">When</th><th scope="col">Plan</th><th scope="col" class="num">Amount</th><th scope="col">Status</th>
                <th scope="col">Receipt</th><th scope="col">Phone</th><th scope="col">Terms</th><th scope="col">Why it failed</th></tr>
            </thead>
            <tbody>
              @for (p of u.payments; track p.id) {
                <tr>
                  <td>{{ dayTime(p.created_at) }}</td>
                  <td>{{ p.plan ?? '—' }}</td>
                  <td class="num">{{ money(p.amount, p.currency) }}</td>
                  <td><span class="pill {{ payPill(p.status).tone }}">{{ payPill(p.status).text }}</span></td>
                  <td>{{ p.mpesa_receipt || '—' }}</td>
                  <td>{{ phone(p.phone_number) }}</td>
                  <td class="muted">{{ p.terms_version || '—' }}</td>
                  <td class="wrap muted">{{ p.failure_reason || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="empty">This customer hasn't made any payments.</p>
        }
      </div>
    } @else if (error()) {
      <p class="form-err" role="alert">{{ error() }}</p>
    } @else {
      <div class="spinner"></div>
    }
  `,
  styles: `
    .back { display: inline-block; margin-bottom: 16px; color: var(--muted); text-decoration: none; font-size: 14px; }
    .back::before { content: "‹ "; }
    .back:hover { color: var(--text); }
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 18px 24px; padding: 20px 22px; margin: 0 0 18px; }
    dt { color: var(--muted); font-size: 13px; }
    dd { margin: 4px 0 0; font-size: 16px; }
    h2 { font-size: 18px; margin-bottom: 12px; }
    .block h2 { margin-bottom: 0; }
    .note { padding: 18px 22px; color: var(--muted); margin: 0 0 28px; }
    .editors { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 28px; align-items: start; }
    .block { padding: 22px; display: grid; gap: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .full { grid-column: 1 / -1; }
    .row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    .check { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; cursor: pointer; }
    .check input { margin-top: 4px; accent-color: var(--magenta); }
    .check small, .hint { display: block; color: var(--muted); font-size: 12px; }
    .muted { color: var(--muted); font-size: 15px; }
    .add-days { display: flex; align-items: flex-end; gap: 12px; }
    .add-days .field { width: 120px; }
    .lifetime { display: grid; gap: 6px; justify-items: start; padding-top: 14px; border-top: 1px solid var(--line); }
    select.input { appearance: auto; }
    @media (max-width: 1100px) { .editors { grid-template-columns: 1fr; } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class UserDetailComponent implements OnInit {
  private api = inject(ApiService);
  id = input.required<string>();
  user = signal<AdminUser | null>(null);
  plans = signal<AdminPlan[]>([]);
  error = signal('');

  details = { first_name: '', last_name: '', email: '', phone_number: '', email_verified: false, suspended: false };
  savingDetails = signal(false);
  detailsOk = signal('');
  detailsErr = signal('');
  detailErrors = signal<Record<string, string>>({});

  sub: { plan: string | null; status: SubStatus; end: string } = { plan: null, status: 'PENDING', end: '' };
  addDays: number | null = 7;
  savingSub = signal(false);
  subOk = signal('');
  subErr = signal('');
  subErrors = signal<Record<string, string>>({});
  statuses: { value: SubStatus; label: string }[] = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'PENDING', label: 'Pending' },
  ];

  money = money;
  day = day;
  dayTime = dayTime;
  phone = phone;
  payPill = paymentPill;

  ngOnInit(): void {
    this.api.user(this.id()).then((u) => this.show(u)).catch((e) => this.error.set(errorMessage(e, "Couldn't load this user.")));
    this.api.adminPlans().then((p) => this.plans.set(p)).catch(() => this.plans.set([]));
  }

  statePill(u: AdminUser): { tone: string; text: string } {
    return u.subscription.lifetime ? { tone: 'ok', text: 'Lifetime' } : subscriptionPill(u.subscription.state);
  }

  /** Put a fresh copy from the server on screen and into both forms. */
  private show(u: AdminUser): void {
    this.user.set(u);
    this.details = {
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      phone_number: u.phone_number ? phone(u.phone_number) : '',
      email_verified: u.email_verified,
      suspended: !u.is_active,
    };
    this.sub = {
      plan: u.subscription.plan_code,
      status: u.subscription.status ?? 'PENDING',
      end: dateInput(u.subscription.current_period_end),
    };
  }

  async saveDetails(): Promise<void> {
    this.savingDetails.set(true);
    this.detailsOk.set('');
    this.detailsErr.set('');
    this.detailErrors.set({});
    const d = this.details;
    try {
      const u = await this.api.updateUser(this.id(), {
        first_name: d.first_name,
        last_name: d.last_name,
        email: d.email,
        phone_number: d.phone_number,
        email_verified: d.email_verified,
        is_active: !d.suspended,
      });
      this.show(u);
      this.detailsOk.set('Details saved.');
    } catch (e) {
      this.detailErrors.set(fieldErrors(e));
      if (!Object.keys(this.detailErrors()).length) this.detailsErr.set(errorMessage(e));
    } finally {
      this.savingDetails.set(false);
    }
  }

  extend(): void {
    const n = Number(this.addDays);
    if (!Number.isInteger(n) || n < 1 || n > 366) {
      this.subErr.set('Add between 1 and 366 days.');
      return;
    }
    this.changeSubscription({ add_days: n }, `Added ${n} ${n === 1 ? 'day' : 'days'}.`);
  }

  saveSubscription(): void {
    const s = this.sub;
    this.changeSubscription(
      {
        plan: s.plan,
        status: s.status,
        // The end of that day in Nairobi, so "ends 14 Nov" means all of 14 Nov.
        current_period_end: s.end ? `${s.end}T23:59:59+03:00` : null,
      },
      'Subscription saved.',
    );
  }

  setLifetime(on: boolean): void {
    const question = on
      ? 'Give this customer a lifetime pass? It is free and never ends.'
      : 'Remove the lifetime pass? Their subscription ends now, unless you then add days.';
    if (!confirm(question)) return;
    this.changeSubscription({ lifetime: on }, on ? 'Lifetime pass given.' : 'Lifetime pass removed.');
  }

  private async changeSubscription(body: AdminSubscriptionChanges, done: string): Promise<void> {
    this.savingSub.set(true);
    this.subOk.set('');
    this.subErr.set('');
    this.subErrors.set({});
    try {
      this.show(await this.api.updateSubscription(this.id(), body));
      this.subOk.set(done);
    } catch (e) {
      this.subErrors.set(fieldErrors(e));
      if (!this.subErrors()['current_period_end']) this.subErr.set(errorMessage(e));
    } finally {
      this.savingSub.set(false);
    }
  }
}
