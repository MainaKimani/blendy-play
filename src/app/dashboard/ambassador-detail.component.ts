import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errorMessage, fieldErrors } from '../core/errors';
import { day, dayTime, money, monthKey, monthName, phone, previousMonthKey } from '../core/format';
import { AmbassadorChanges, AmbassadorDetail, CommissionRow, ReferredCustomer } from '../core/models';
import { Bar, BarChartComponent } from '../shared/bar-chart.component';
import { subscriptionPill } from '../shared/status';

/** One ambassador: their numbers, customers (full emails), commission lines and payouts. */
@Component({
  selector: 'bp-ambassador-detail',
  imports: [FormsModule, RouterLink, BarChartComponent],
  template: `
    <a class="back" routerLink="/dashboard/referrals" [queryParams]="{ month: month() }">← All ambassadors</a>

    @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }
    @if (notice()) { <p class="form-ok" role="status">{{ notice() }}</p> }

    @if (a(); as a) {
      <div class="page-head">
        <div>
          <h1>{{ a.name }}</h1>
          <p>
            <span class="code">{{ a.code }}</span> · {{ rate(a.commission_rate) }}% for 12 months · {{ a.email }}
            @if (a.payout_phone) { · M-Pesa {{ phone(a.payout_phone) }} }
            @if (!a.is_active) { <span class="pill quiet">Paused</span> }
            @if (!a.has_password) { <span class="pill warn">Hasn't set a password yet</span> }
          </p>
        </div>
        <div class="head-actions">
          <label class="visually-hidden" for="month">Month</label>
          <input id="month" class="input month" type="month" [max]="thisMonth" [ngModel]="month()" (ngModelChange)="pickMonth($event)">
          <button class="btn ghost" type="button" [disabled]="downloading()" (click)="download()">
            {{ downloading() ? 'Preparing…' : 'Download Excel' }}
          </button>
          @if (auth.isSuperAdmin() && !editing()) {
            <button class="btn ghost" type="button" (click)="startEdit()">Edit</button>
          }
        </div>
      </div>

      @if (editing()) {
        <form class="panel editor" (ngSubmit)="save()" novalidate>
          <h2>Edit {{ a.name }}</h2>
          <div class="grid">
            <label class="field"><span>First name</span><input class="input" name="first_name" [(ngModel)]="draft.first_name"></label>
            <label class="field"><span>Last name</span><input class="input" name="last_name" [(ngModel)]="draft.last_name"></label>
            <label class="field">
              <span>Referral code</span>
              <input class="input upper" name="code" maxlength="20" [(ngModel)]="draft.code">
              <span class="hint">Changing it stops the old code working for new sign-ups.</span>
              @if (errors()['code']) { <span class="err">{{ errors()['code'] }}</span> }
            </label>
            <label class="field">
              <span>Commission %</span>
              <input class="input" name="rate" type="number" min="0" max="100" step="0.5" [(ngModel)]="draft.commission_rate">
              <span class="hint">Applies to payments from now on. Past commission keeps its rate.</span>
            </label>
            <label class="field"><span>M-Pesa number for payouts</span><input class="input" name="phone" [(ngModel)]="draft.payout_phone"></label>
            <label class="field check">
              <input type="checkbox" name="active" [(ngModel)]="draft.is_active">
              <span>Code works for new sign-ups</span>
            </label>
            <label class="field full"><span>Notes</span><input class="input" name="notes" [(ngModel)]="draft.notes"></label>
          </div>
          <div class="row">
            <button class="btn" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button class="btn ghost" type="button" (click)="editing.set(false)">Cancel</button>
            @if (formErr()) { <span class="form-err" role="alert">{{ formErr() }}</span> }
          </div>
        </form>
      }

      <div class="figures">
        <div class="figure"><span class="f-label">New referrals</span><span class="f-value">{{ a.figures.new_referrals }}</span></div>
        <div class="figure"><span class="f-label">Paying customers</span><span class="f-value">{{ a.figures.paying_customers }}</span></div>
        <div class="figure"><span class="f-label">Revenue</span><span class="f-value">{{ money(a.figures.revenue) }}</span></div>
        <div class="figure"><span class="f-label">Commission earned</span><span class="f-value">{{ money(a.figures.commission_earned) }}</span>
          @if (+a.figures.reversals) { <span class="f-note">{{ money(a.figures.reversals) }} reversed</span> }
        </div>
        <div class="figure"><span class="f-label">Referrals in total</span><span class="f-value">{{ a.figures.total_referrals }}</span></div>
        <div class="figure"><span class="f-label">Active subscriptions now</span><span class="f-value">{{ a.figures.active_subscriptions }}</span></div>
        <div class="figure"><span class="f-label">Paid for {{ monthName(month()) }}</span><span class="f-value">{{ money(a.figures.paid_out) }}</span></div>
        <div class="figure"><span class="f-label">Owed now</span><span class="f-value" [class.neg]="+a.figures.owed < 0">{{ money(a.figures.owed) }}</span></div>
      </div>

      <div class="two">
        <section class="panel block">
          <h2>Revenue from their customers, last 12 months</h2>
          <bp-bar-chart [data]="revenueBars()" color="var(--chart-money)" [height]="200" [tickFormat]="moneyTick"
                        ariaLabel="Revenue per month in KES" />
        </section>
        <section class="panel block">
          <h2>Commission, last 12 months</h2>
          <bp-bar-chart [data]="commissionBars()" color="var(--chart-magenta)" [height]="200" [tickFormat]="moneyTick"
                        ariaLabel="Commission per month in KES" />
        </section>
      </div>

      <section class="panel block">
        <div class="block-head">
          <h2>Payouts</h2>
          @if (auth.isSuperAdmin()) {
            <form class="payout-form" (ngSubmit)="recordPayout()" novalidate>
              <label class="visually-hidden" for="p-month">For month</label>
              <input id="p-month" class="input" type="month" name="p_month" [max]="thisMonth" [(ngModel)]="payout.month">
              <label class="visually-hidden" for="p-amount">Amount in KES</label>
              <input id="p-amount" class="input" type="number" name="p_amount" min="1" step="1" placeholder="Amount (KES)" [(ngModel)]="payout.amount">
              <label class="visually-hidden" for="p-ref">M-Pesa reference</label>
              <input id="p-ref" class="input upper" name="p_ref" placeholder="M-Pesa reference" [(ngModel)]="payout.mpesa_reference">
              <button class="btn small" type="submit" [disabled]="busy()">Record payout</button>
            </form>
          }
        </div>
        @if (a.payouts.length) {
          <table class="dt">
            <thead><tr><th scope="col">For</th><th scope="col">Paid</th><th scope="col">M-Pesa reference</th><th scope="col" class="num">Amount</th><th scope="col"></th></tr></thead>
            <tbody>
              @for (p of a.payouts; track p.id) {
                <tr>
                  <td>{{ monthName(p.month) }}</td>
                  <td>{{ dayTime(p.paid_at) }}</td>
                  <td>{{ p.mpesa_reference || '—' }}</td>
                  <td class="num">{{ money(p.amount) }}</td>
                  <td class="act"><div class="actions">
                    @if (auth.isSuperAdmin()) {
                      @if (confirming() === 'payout-' + p.id) {
                        <button class="btn danger small" type="button" (click)="deletePayout(p.id)">Delete</button>
                        <button class="btn ghost small" type="button" (click)="confirming.set(null)">Keep</button>
                      } @else {
                        <button class="btn ghost small" type="button" (click)="confirming.set('payout-' + p.id)">Delete</button>
                      }
                    }
                  </div></td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="muted">No payouts recorded yet.</p>
        }
      </section>

      <section class="panel block">
        <h2>Commission in {{ monthName(month()) }}</h2>
        @if (lines(); as list) {
          @if (list.length) {
            <div class="table-wrap">
              <table class="dt">
                <thead><tr><th scope="col">Paid</th><th scope="col">Customer</th><th scope="col">Plan</th>
                  <th scope="col" class="num">Payment</th><th scope="col" class="num">Rate</th><th scope="col" class="num">Commission</th>
                  <th scope="col">Status</th><th scope="col"></th></tr></thead>
                <tbody>
                  @for (l of list; track l.id) {
                    <tr>
                      <td>{{ dayTime(l.date) }}</td>
                      <td>{{ l.email }}</td>
                      <td>{{ l.plan }}</td>
                      <td class="num">{{ money(l.payment_amount) }}</td>
                      <td class="num">{{ rate(l.rate) }}%</td>
                      <td class="num">{{ money(l.amount) }}</td>
                      <td>
                        @if (l.status === 'reversed') {
                          <span class="pill bad">Reversed {{ day(l.reversed_at) }}</span>
                        } @else { <span class="pill ok">Earned</span> }
                        @if (!l.earned_this_month) { <span class="muted"> (earned earlier)</span> }
                      </td>
                      <td class="act"><div class="actions">
                        @if (auth.isSuperAdmin() && l.status === 'earned') {
                          @if (confirming() === 'line-' + l.id) {
                            <span class="muted">Refunded?</span>
                            <button class="btn danger small" type="button" (click)="reverse(l)">Reverse</button>
                            <button class="btn ghost small" type="button" (click)="confirming.set(null)">Keep</button>
                          } @else {
                            <button class="btn ghost small" type="button" (click)="confirming.set('line-' + l.id)">Reverse</button>
                          }
                        }
                      </div></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="muted">No commission in {{ monthName(month()) }}.</p>
          }
        } @else { <div class="spinner"></div> }
      </section>

      <section class="panel block">
        <h2>Customers ({{ customers()?.length ?? 0 }})</h2>
        @if (customers(); as list) {
          @if (list.length) {
            <div class="table-wrap">
              <table class="dt">
                <thead><tr><th scope="col">Customer</th><th scope="col">Joined</th><th scope="col">How</th><th scope="col">Plan</th>
                  <th scope="col">Subscription</th><th scope="col">Earns until</th><th scope="col" class="num">Commission</th></tr></thead>
                <tbody>
                  @for (c of list; track c.id) {
                    <tr>
                      <td><a [routerLink]="['/dashboard/users', c.customer_id]">{{ c.email }}</a></td>
                      <td>{{ day(c.joined_at) }}</td>
                      <td>{{ c.source === 'signup' ? 'Code at sign-up' : 'Set by admin' }}</td>
                      <td>{{ c.plan ?? '—' }}</td>
                      <td><span class="pill {{ pill(c).tone }}">{{ pill(c).text }}</span></td>
                      <td>{{ c.window_ends_at ? day(c.window_ends_at) : 'Not paid yet' }}</td>
                      <td class="num">{{ money(c.commission) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else { <p class="muted">No customers yet.</p> }
        } @else { <div class="spinner"></div> }
      </section>

      @if (auth.isSuperAdmin()) {
        <section class="panel emails">
          <p class="muted">Their monthly report is emailed on the 1st at 09:00.</p>
          <button class="btn ghost small" type="button" [disabled]="busy()" (click)="resend()">
            Email their {{ monthName(month()) }} report now
          </button>
        </section>
      }
    } @else if (!error()) {
      <div class="spinner"></div>
    }
  `,
  styles: `
    :host { display: grid; gap: 18px; }
    .back { color: var(--muted); text-decoration: none; font-size: 14px; }
    .back:hover { color: var(--text); }
    .page-head { margin-bottom: 0; }
    .page-head p { overflow-wrap: anywhere; }
    .code { color: var(--text); font-weight: 700; letter-spacing: 0.06em; }
    .head-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .month { width: auto; padding: 9px 12px; }
    .pill { margin-left: 6px; }
    .editor { padding: 22px; display: grid; gap: 14px; max-width: 760px; }
    .editor h2 { font-size: 18px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .full { grid-column: 1 / -1; }
    .hint { color: var(--muted); font-size: 12px; }
    .check { display: flex; align-items: center; gap: 10px; align-self: end; padding-bottom: 12px; }
    .check > span { color: var(--text); font-size: 14px; }
    .upper { text-transform: uppercase; }
    .row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    .figures {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; background: var(--line);
      border: 1px solid var(--line); border-radius: var(--radius-l); overflow: hidden;
    }
    .figure { background: var(--card); padding: 18px 20px; display: grid; gap: 6px; align-content: start; }
    .f-label { color: var(--muted); font-size: 14px; }
    .f-value { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .f-note { color: var(--muted); font-size: 12px; }
    .neg { color: var(--bad); }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .block { padding: 20px 22px; display: grid; gap: 14px; align-content: start; }
    .block h2 { font-size: 16px; font-weight: 500; }
    .block-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .payout-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .payout-form .input { width: auto; padding: 8px 12px; max-width: 180px; }
    .table-wrap { overflow-x: auto; }
    .act { width: 1%; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
    td a { color: var(--text); text-decoration: none; }
    td a:hover { color: var(--cyan); }
    .muted { color: var(--muted); }
    .emails { padding: 16px 22px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    @media (max-width: 900px) { .figures { grid-template-columns: repeat(2, minmax(0, 1fr)); } .two { grid-template-columns: 1fr; } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class AmbassadorDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);

  private id = this.route.snapshot.paramMap.get('id')!;
  readonly thisMonth = monthKey();
  month = signal(this.route.snapshot.queryParamMap.get('month') ?? previousMonthKey());
  a = signal<AmbassadorDetail | null>(null);
  customers = signal<ReferredCustomer[] | null>(null);
  lines = signal<CommissionRow[] | null>(null);
  error = signal('');
  notice = signal('');
  busy = signal(false);
  downloading = signal(false);
  confirming = signal<string | null>(null);

  editing = signal(false);
  saving = signal(false);
  formErr = signal('');
  errors = signal<Record<string, string>>({});
  draft: AmbassadorChanges = {};
  payout = { month: previousMonthKey(), amount: '', mpesa_reference: '' };

  money = money;
  day = day;
  dayTime = dayTime;
  phone = phone;
  monthName = monthName;
  moneyTick = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

  revenueBars = computed<Bar[]>(() => this.bars('revenue'));
  commissionBars = computed<Bar[]>(() => this.bars('commission'));

  private bars(key: 'revenue' | 'commission'): Bar[] {
    return (this.a()?.series ?? []).map((p) => ({
      label: monthName(p.month, true),
      value: Number(p[key]),
      display: money(p[key]),
      detail: monthName(p.month),
    }));
  }

  ngOnInit(): void {
    this.load();
    this.api.ambassadorCustomersAdmin(this.id).then((c) => this.customers.set(c)).catch(() => this.customers.set([]));
  }

  pickMonth(value: string): void {
    if (!value) return;
    this.month.set(value);
    this.router.navigate([], { queryParams: { month: value }, replaceUrl: true });
    this.load();
  }

  private load(): void {
    this.api
      .ambassador(this.id, this.month())
      .then((a) => {
        this.a.set(a);
        this.error.set('');
      })
      .catch((err) => this.error.set(errorMessage(err, "Couldn't load this ambassador.")));
    this.lines.set(null);
    this.api.commission(this.month(), this.id).then((l) => this.lines.set(l)).catch(() => this.lines.set([]));
  }

  rate(r: string): string {
    return String(Number(r));
  }

  pill(c: ReferredCustomer) {
    return subscriptionPill(c.subscription);
  }

  startEdit(): void {
    const a = this.a()!;
    this.draft = {
      first_name: a.first_name, last_name: a.last_name, code: a.code, commission_rate: a.commission_rate,
      payout_phone: a.payout_phone, is_active: a.is_active, notes: a.notes,
    };
    this.errors.set({});
    this.formErr.set('');
    this.editing.set(true);
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.errors.set({});
    this.formErr.set('');
    try {
      await this.api.updateAmbassador(this.id, {
        ...this.draft,
        code: (this.draft.code ?? '').trim().toUpperCase(),
        commission_rate: String(this.draft.commission_rate),
      });
      this.editing.set(false);
      this.notice.set('Saved.');
      this.load();
    } catch (err) {
      this.errors.set(fieldErrors(err));
      this.formErr.set(Object.keys(fieldErrors(err)).length ? '' : errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  private async act(work: () => Promise<unknown>, done: string): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await work();
      this.notice.set(done);
      this.confirming.set(null);
      this.load();
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  recordPayout(): void {
    const { month, amount, mpesa_reference } = this.payout;
    if (!month || !(Number(amount) > 0)) {
      this.error.set('Enter the month and the amount sent.');
      return;
    }
    this.act(
      () => this.api.recordPayout(this.id, { month, amount: String(amount), mpesa_reference }),
      `Recorded ${money(amount)} for ${monthName(month)}.`,
    ).then(() => (this.payout = { month: previousMonthKey(), amount: '', mpesa_reference: '' }));
  }

  deletePayout(payoutId: number): void {
    this.act(() => this.api.deletePayout(this.id, payoutId), 'Payout deleted.');
  }

  reverse(line: CommissionRow): void {
    this.act(() => this.api.reverseCommission(line.id, 'Payment refunded'), `Reversed ${money(line.amount)} commission.`);
  }

  resend(): void {
    this.act(() => this.api.resendReport(this.month(), this.id), `Their ${monthName(this.month())} report is on its way.`);
  }

  async download(): Promise<void> {
    this.downloading.set(true);
    try {
      await this.api.ambassadorReportAdmin(this.id, this.month());
    } catch (err) {
      this.error.set(errorMessage(err, "Couldn't prepare the report."));
    } finally {
      this.downloading.set(false);
    }
  }
}
