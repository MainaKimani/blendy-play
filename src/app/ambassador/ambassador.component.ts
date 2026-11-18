import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/errors';
import { day, money, monthKey, monthName } from '../core/format';
import { AmbassadorSummary, ReferredCustomer } from '../core/models';
import { Bar, BarChartComponent } from '../shared/bar-chart.component';
import { subscriptionPill } from '../shared/status';

/**
 * An ambassador's own page: their code, how their customers are doing, and
 * what they've earned. Customers' emails arrive masked from the backend
 * (wan***mau@gmail.com); names and phone numbers are never sent.
 */
@Component({
  selector: 'bp-ambassador',
  imports: [FormsModule, RouterLink, BarChartComponent],
  template: `
    <header class="top">
      <a class="brand" routerLink="/" aria-label="Blendy Play home">
        <img src="brand/mark-192.png" alt="" width="32" height="32">
        <span class="neon-text">Blendy Play</span>
      </a>
      <div class="who">
        <a class="btn ghost small" routerLink="/account">My account</a>
        <button class="btn ghost small" type="button" (click)="auth.signOut('/')">Sign out</button>
      </div>
    </header>

    <main class="body">
      <p class="eyebrow">Ambassador</p>
      <h1>{{ auth.me()?.first_name ? 'Hi, ' + auth.me()!.first_name + '.' : 'Your ambassador page' }}</h1>

      @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }

      @if (summary(); as s) {
        @if (!s.is_active) {
          <p class="paused" role="status">
            Your code is paused, so new sign-ups can't use it. Customers who already joined with it still earn you
            commission for the rest of their 12 months.
          </p>
        }

        <section class="panel code-card">
          <div>
            <span class="label">Your referral code</span>
            <div class="code-row">
              <strong class="code">{{ s.code }}</strong>
              <button class="btn ghost small" type="button" (click)="copy(s.code, 'code')">
                {{ copied() === 'code' ? 'Copied' : 'Copy code' }}
              </button>
              <button class="btn ghost small" type="button" (click)="copy(link(s.code), 'link')">
                {{ copied() === 'link' ? 'Copied' : 'Copy link' }}
              </button>
            </div>
          </div>
          <p class="how">
            New customers type this code when they create their Blendy Play account in the app. You earn
            <strong>{{ rate(s.commission_rate) }}%</strong> of every payment they make in their first 12 months.
          </p>
        </section>

        <div class="bar">
          <h2>{{ monthName(month()) }}</h2>
          <div class="bar-actions">
            <label class="visually-hidden" for="month">Month</label>
            <input id="month" class="input month" type="month" [max]="thisMonth" [ngModel]="month()"
                   (ngModelChange)="pickMonth($event)">
            <button class="btn ghost small" type="button" [disabled]="downloading()" (click)="download()">
              {{ downloading() ? 'Preparing…' : 'Download Excel report' }}
            </button>
          </div>
        </div>

        <div class="figures">
          <div class="figure"><span class="f-label">New referrals</span><span class="f-value">{{ s.figures.new_referrals }}</span></div>
          <div class="figure"><span class="f-label">Paying customers</span><span class="f-value">{{ s.figures.paying_customers }}</span></div>
          <div class="figure"><span class="f-label">Revenue from your customers</span><span class="f-value">{{ money(s.figures.revenue) }}</span></div>
          <div class="figure"><span class="f-label">Commission earned</span><span class="f-value neon-text">{{ money(s.figures.commission_earned) }}</span>
            @if (+s.figures.reversals) { <span class="f-note">{{ money(s.figures.reversals) }} reversed for refunds</span> }
          </div>
          <div class="figure"><span class="f-label">Referrals in total</span><span class="f-value">{{ s.figures.total_referrals }}</span></div>
          <div class="figure"><span class="f-label">Active subscriptions now</span><span class="f-value">{{ s.figures.active_subscriptions }}</span></div>
          <div class="figure"><span class="f-label">Paid to you for this month</span><span class="f-value">{{ money(s.figures.paid_out) }}</span></div>
          <div class="figure"><span class="f-label">Owed to you now</span><span class="f-value">{{ money(s.figures.owed) }}</span>
            @if (+s.figures.owed < 0) { <span class="f-note">A refunded payment was already paid out; it comes off your next commission.</span> }
          </div>
        </div>

        <section class="panel chart">
          <h2>Commission, last 12 months</h2>
          <bp-bar-chart [data]="bars()" color="var(--chart-magenta)" [height]="220" [tickFormat]="moneyTick"
                        ariaLabel="Commission per month in KES" />
        </section>

        <section class="panel">
          <div class="list-head">
            <h2>Your customers</h2>
            <span class="muted">{{ customers()?.length ?? 0 }} in total</span>
          </div>
          @if (customers(); as list) {
            @if (list.length) {
              <div class="dt-wrap flat">
                <table class="dt">
                  <thead>
                    <tr><th scope="col">Customer</th><th scope="col">Joined</th><th scope="col">Plan</th>
                      <th scope="col">Subscription</th><th scope="col">Earns you until</th><th scope="col" class="num">Your commission</th></tr>
                  </thead>
                  <tbody>
                    @for (c of list; track c.id) {
                      <tr>
                        <td>{{ c.email }}</td>
                        <td>{{ day(c.joined_at) }}</td>
                        <td>{{ c.plan ?? '—' }}</td>
                        <td><span class="pill {{ pill(c).tone }}">{{ pill(c).text }}</span></td>
                        <td>{{ c.window_ends_at ? day(c.window_ends_at) : 'Starts at first payment' }}</td>
                        <td class="num">{{ money(c.commission) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="muted empty">No one has used your code yet. Share it with people who'd like ad-free watching.</p>
            }
          } @else {
            <div class="spinner"></div>
          }
        </section>
        <p class="muted small">
          Customer emails are partly hidden to protect their privacy. Your report is also emailed to you on the 1st of
          every month.
        </p>
      } @else if (!error()) {
        <div class="spinner"></div>
      }
    </main>
  `,
  styles: `
    .top, .body { width: min(100% - 32px, 1040px); margin-inline: auto; }
    .top { display: flex; justify-content: space-between; align-items: center; padding: 18px 0; gap: 12px; }
    .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 700; font-size: 18px; }
    .who { display: flex; gap: 10px; }
    .body { padding: 20px 0 64px; display: grid; gap: 20px; }
    .eyebrow { color: var(--cyan); font-size: 13px; text-transform: uppercase; letter-spacing: 0.12em; }
    h1 { font-size: clamp(28px, 5vw, 40px); letter-spacing: -0.02em; margin-top: -12px; }
    h2 { font-size: 18px; font-weight: 500; }
    .paused { padding: 12px 16px; border-radius: var(--radius-m); border: 1px solid rgba(251, 191, 36, 0.4); color: var(--warn); }
    .code-card { padding: 22px; display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center; }
    .label { color: var(--muted); font-size: 13px; }
    .code-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
    .code {
      font-size: 30px; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 11px; border: 1px dashed #3a3a46;
      font-variant-numeric: tabular-nums;
    }
    .how { color: #c9c9d3; max-width: 52ch; }
    .bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-top: 8px; }
    .bar-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .month { width: auto; padding: 8px 12px; }
    .figures {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; background: var(--line);
      border: 1px solid var(--line); border-radius: var(--radius-l); overflow: hidden;
    }
    .figure { background: var(--card); padding: 18px 20px; display: grid; gap: 6px; align-content: start; }
    .f-label { color: var(--muted); font-size: 14px; }
    .f-value { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .f-note { color: var(--muted); font-size: 12px; }
    .chart { padding: 20px 22px; display: grid; gap: 14px; }
    .panel { padding: 20px 22px; }
    .list-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
    .dt-wrap.flat { border: 0; background: none; }
    .empty { padding: 8px 0; }
    .muted { color: var(--muted); }
    .small { font-size: 13px; }
    @media (max-width: 900px) { .figures { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 640px) { .code-card { grid-template-columns: 1fr; } }
    @media (max-width: 420px) { .figures { grid-template-columns: 1fr; } }
  `,
})
export class AmbassadorComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  readonly thisMonth = monthKey();
  month = signal(this.thisMonth);
  summary = signal<AmbassadorSummary | null>(null);
  customers = signal<ReferredCustomer[] | null>(null);
  error = signal('');
  copied = signal<'code' | 'link' | null>(null);
  downloading = signal(false);

  money = money;
  day = day;
  monthName = monthName;
  moneyTick = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

  bars = computed<Bar[]>(() =>
    (this.summary()?.series ?? []).map((p) => ({
      label: monthName(p.month, true),
      value: Number(p.commission),
      display: money(p.commission),
      detail: `${monthName(p.month)}, from ${money(p.revenue)} revenue`,
    })),
  );

  ngOnInit(): void {
    this.load();
    this.api.ambassadorCustomers().then((c) => this.customers.set(c)).catch(() => this.customers.set([]));
  }

  pickMonth(value: string): void {
    if (!value) return;
    this.month.set(value);
    this.load();
  }

  private load(): void {
    this.api
      .ambassadorSummary(this.month())
      .then((s) => {
        this.summary.set(s);
        this.error.set('');
      })
      .catch((err) => this.error.set(errorMessage(err, "Couldn't load your figures. Try again.")));
  }

  async download(): Promise<void> {
    this.downloading.set(true);
    try {
      await this.api.ambassadorReport(this.month());
    } catch (err) {
      this.error.set(errorMessage(err, "Couldn't prepare the report. Try again."));
    } finally {
      this.downloading.set(false);
    }
  }

  link(code: string): string {
    return `${location.origin}/?ref=${encodeURIComponent(code)}`;
  }

  copy(text: string, what: 'code' | 'link'): void {
    navigator.clipboard?.writeText(text).then(() => {
      this.copied.set(what);
      setTimeout(() => this.copied.set(null), 1800);
    });
  }

  rate(r: string): string {
    return String(Number(r));
  }

  pill(c: ReferredCustomer) {
    return subscriptionPill(c.subscription);
  }
}
