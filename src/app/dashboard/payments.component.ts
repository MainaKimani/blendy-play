import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { dayTime, money, phone } from '../core/format';
import { AdminPayment, Page } from '../core/models';
import { PagerComponent } from '../shared/pager.component';
import { paymentPill } from '../shared/status';
import { ListBase } from './list-base';

@Component({
  selector: 'bp-payments',
  imports: [RouterLink, PagerComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Payments</h1>
        <p>Every M-Pesa payment attempt, newest first.</p>
      </div>
    </div>
    <div class="toolbar">
      <input class="input" type="search" placeholder="Search email, phone or receipt" aria-label="Search payments"
             [value]="search()" (input)="onSearch($any($event.target).value)">
      <div class="chips" role="group" aria-label="Filter by status">
        @for (f of filters; track f.value) {
          <button type="button" class="chip" [class.on]="filter() === f.value" [attr.aria-pressed]="filter() === f.value" (click)="setFilter(f.value)">{{ f.label }}</button>
        }
      </div>
    </div>
    @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }
    @if (data(); as d) {
      <div class="dt-wrap">
        @if (d.results.length) {
          <table class="dt">
            <thead>
              <tr><th scope="col">When</th><th scope="col">Customer</th><th scope="col">Plan</th><th scope="col" class="num">Amount</th>
                <th scope="col">Status</th><th scope="col">Receipt</th><th scope="col">Phone</th><th scope="col">Why it failed</th></tr>
            </thead>
            <tbody>
              @for (p of d.results; track p.id) {
                <tr>
                  <td>{{ dayTime(p.created_at) }}</td>
                  <td><a [routerLink]="['/dashboard/users', p.user.id]">{{ p.user.email }}</a></td>
                  <td>{{ p.plan ?? '—' }}</td>
                  <td class="num">{{ money(p.amount, p.currency) }}</td>
                  <td><span class="pill {{ pill(p.status).tone }}">{{ pill(p.status).text }}</span></td>
                  <td>{{ p.mpesa_receipt || '—' }}</td>
                  <td>{{ phone(p.phone_number) }}</td>
                  <td class="wrap muted">{{ p.failure_reason || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="empty">{{ search() || filter() ? 'No payments match this search.' : 'No payments yet.' }}</p>
        }
      </div>
      <bp-pager [page]="page()" [count]="d.count" [size]="25" (go)="load($event)" />
    } @else if (!error()) {
      <div class="spinner"></div>
    }
  `,
})
export class PaymentsComponent extends ListBase<Page<AdminPayment>> implements OnInit {
  private api = inject(ApiService);
  protected override filterKey = 'status';
  filters = [
    { value: '', label: 'All' },
    { value: 'succeeded', label: 'Paid' },
    { value: 'pending', label: 'Waiting' },
    { value: 'failed', label: 'Failed or cancelled' },
  ];
  money = money;
  dayTime = dayTime;
  phone = phone;
  pill = paymentPill;

  ngOnInit(): void {
    this.load(1);
  }

  protected fetch(q: Record<string, string | number>) {
    return this.api.payments(q);
  }

  protected message(e: unknown): string {
    return errorMessage(e);
  }
}
