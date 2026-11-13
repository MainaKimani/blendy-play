import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { dayTime, money } from '../core/format';
import { MyPayment, Page } from '../core/models';
import { PagerComponent } from '../shared/pager.component';
import { paymentPill } from '../shared/status';

@Component({
  selector: 'bp-my-payments',
  imports: [PagerComponent],
  template: `
    <section class="panel block">
      <h2>Payments</h2>
      @if (data(); as d) {
        @if (d.count === 0) {
          <p class="muted">No payments yet. When you pay for a plan in the app, it shows up here with its M-Pesa receipt.</p>
        } @else {
          <div class="table-wrap">
            <table>
              <caption class="visually-hidden">Your payments, newest first</caption>
              <thead>
                <tr><th scope="col">Date</th><th scope="col">Plan</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">M-Pesa receipt</th></tr>
              </thead>
              <tbody>
                @for (p of d.results; track p.id) {
                  <tr>
                    <td>{{ dayTime(p.paid_at ?? p.created_at) }}</td>
                    <td>{{ p.plan ?? '—' }}</td>
                    <td class="num">{{ money(p.amount, p.currency) }}</td>
                    <td><span class="pill {{ pill(p.status).tone }}">{{ pill(p.status).text }}</span></td>
                    <td class="receipt">{{ p.mpesa_receipt || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <bp-pager [page]="page()" [count]="d.count" [size]="20" (go)="load($event)" />
        }
      } @else if (error()) {
        <p class="form-err">{{ error() }}</p>
      } @else {
        <div class="spinner"></div>
      }
    </section>
  `,
  styles: `
    .block { padding: 24px; display: grid; gap: 14px; }
    h2 { font-size: 18px; }
    .muted { color: var(--muted); }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; font-weight: 500; color: var(--muted); padding: 8px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
    td { padding: 12px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
    tr:last-child td { border-bottom: 0; }
    .num { font-variant-numeric: tabular-nums; }
    .receipt { letter-spacing: 0.02em; }
  `,
})
export class MyPaymentsComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<Page<MyPayment> | null>(null);
  error = signal('');
  page = signal(1);
  money = money;
  dayTime = dayTime;
  pill = paymentPill;

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.page.set(page);
    this.api.myPayments(page).then((d) => this.data.set(d)).catch((e) => this.error.set(errorMessage(e)));
  }
}
