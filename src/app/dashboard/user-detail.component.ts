import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { day, dayTime, money, phone } from '../core/format';
import { AdminUser } from '../core/models';
import { paymentPill, subscriptionPill } from '../shared/status';

@Component({
  selector: 'bp-user-detail',
  imports: [RouterLink],
  template: `
    <a class="back" routerLink="/dashboard/users">All users</a>
    @if (user(); as u) {
      <div class="page-head">
        <div>
          <h1>{{ u.name || u.email }}</h1>
          <p>{{ u.email }}, joined {{ day(u.created_at) }}</p>
        </div>
        <span class="pill {{ subPill(u.subscription.state).tone }}">{{ subPill(u.subscription.state).text }}</span>
      </div>
      <dl class="facts panel">
        <div><dt>Plan</dt><dd>{{ u.subscription.plan ?? '—' }}</dd></div>
        <div><dt>Ends</dt><dd>{{ day(u.subscription.current_period_end) }}</dd></div>
        <div><dt>Phone</dt><dd>{{ phone(u.phone_number) }}</dd></div>
        <div><dt>Paid in total</dt><dd>{{ money(u.total_paid) }}</dd></div>
        <div><dt>Payments</dt><dd>{{ u.payments_count ?? 0 }}</dd></div>
        <div><dt>CineJoy number</dt><dd>{{ u.has_cinejoy_account ? 'Saved' : 'Not saved' }}</dd></div>
        <div><dt>Account</dt><dd>{{ u.is_active ? 'Active' : 'Deleted' }}</dd></div>
      </dl>
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
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 18px 24px; padding: 20px 22px; margin: 0 0 28px; }
    dt { color: var(--muted); font-size: 13px; }
    dd { margin: 4px 0 0; font-size: 16px; }
    h2 { font-size: 18px; margin-bottom: 12px; }
  `,
})
export class UserDetailComponent implements OnInit {
  private api = inject(ApiService);
  id = input.required<string>();
  user = signal<AdminUser | null>(null);
  error = signal('');
  money = money;
  day = day;
  dayTime = dayTime;
  phone = phone;
  subPill = subscriptionPill;
  payPill = paymentPill;

  ngOnInit(): void {
    this.api.user(this.id()).then((u) => this.user.set(u)).catch((e) => this.error.set(errorMessage(e, "Couldn't load this user.")));
  }
}
