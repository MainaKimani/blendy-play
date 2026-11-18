import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errorMessage, fieldErrors } from '../core/errors';
import { dayTime, money, monthKey, monthName, previousMonthKey } from '../core/format';
import { AmbassadorRow, NewAmbassador, ReferralsOverview } from '../core/models';

type SortKey = 'revenue' | 'paying_customers' | 'commission_earned' | 'owed' | 'code';

/**
 * Referrals: how each ambassador is doing in a month, the month's Excel
 * workbook, and adding ambassadors. Staff can look; super-admins change.
 */
@Component({
  selector: 'bp-referrals',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Referrals</h1>
        <p>Ambassadors earn commission on the customers who sign up with their code.</p>
      </div>
      <div class="head-actions">
        <label class="visually-hidden" for="month">Month</label>
        <input id="month" class="input month" type="month" [max]="thisMonth" [ngModel]="month()" (ngModelChange)="pickMonth($event)">
        <button class="btn ghost" type="button" [disabled]="downloading()" (click)="download()">
          {{ downloading() ? 'Preparing…' : 'Download Excel' }}
        </button>
        @if (auth.isSuperAdmin() && !adding()) {
          <button class="btn" type="button" (click)="startAdd()">Add ambassador</button>
        }
      </div>
    </div>

    @if (adding()) {
      <form class="panel editor" (ngSubmit)="add()" novalidate>
        <h2>Add an ambassador</h2>
        <div class="grid">
          <label class="field full">
            <span>Email</span>
            <input class="input" name="email" type="email" autocomplete="off" [(ngModel)]="draft.email">
            <span class="hint">If this email has no account yet, we create one and email a link to choose a password.</span>
            @if (errors()['email']) { <span class="err">{{ errors()['email'] }}</span> }
          </label>
          <label class="field"><span>First name</span><input class="input" name="first_name" [(ngModel)]="draft.first_name"></label>
          <label class="field"><span>Last name</span><input class="input" name="last_name" [(ngModel)]="draft.last_name"></label>
          <label class="field">
            <span>Referral code</span>
            <input class="input code" name="code" autocomplete="off" maxlength="20" [(ngModel)]="draft.code">
            <span class="hint">4 to 20 letters and digits. Case doesn't matter.</span>
            @if (errors()['code']) { <span class="err">{{ errors()['code'] }}</span> }
          </label>
          <label class="field">
            <span>Commission %</span>
            <input class="input" name="rate" type="number" min="0" max="100" step="0.5" [(ngModel)]="draft.commission_rate">
          </label>
          <label class="field">
            <span>M-Pesa number for payouts</span>
            <input class="input" name="phone" inputmode="tel" placeholder="2547XXXXXXXX" [(ngModel)]="draft.payout_phone">
          </label>
          <label class="field full"><span>Notes</span><input class="input" name="notes" [(ngModel)]="draft.notes"></label>
        </div>
        <div class="row">
          <button class="btn" type="submit" [disabled]="saving()">{{ saving() ? 'Adding…' : 'Add ambassador' }}</button>
          <button class="btn ghost" type="button" (click)="adding.set(false)">Cancel</button>
          @if (formErr()) { <span class="form-err" role="alert">{{ formErr() }}</span> }
        </div>
      </form>
    }

    @if (notice()) { <p class="form-ok" role="status">{{ notice() }}</p> }
    @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }

    @if (data(); as d) {
      <div class="figures">
        <div class="figure"><span class="f-label">Revenue from referred customers</span><span class="f-value">{{ money(d.totals.revenue ?? 0) }}</span></div>
        <div class="figure"><span class="f-label">Commission earned</span><span class="f-value">{{ money(d.totals.commission_earned ?? 0) }}</span></div>
        <div class="figure"><span class="f-label">New referrals</span><span class="f-value">{{ d.totals.new_referrals ?? 0 }}</span></div>
        <div class="figure"><span class="f-label">Owed to ambassadors now</span><span class="f-value">{{ money(d.totals.owed ?? 0) }}</span></div>
      </div>

      <div class="dt-wrap">
        <table class="dt">
          <thead>
            <tr>
              <th scope="col"><button class="sort" type="button" (click)="sortBy('code')">Ambassador</button></th>
              <th scope="col" class="num">New</th>
              <th scope="col" class="num">Total</th>
              <th scope="col" class="num"><button class="sort" type="button" (click)="sortBy('paying_customers')">Paying</button></th>
              <th scope="col" class="num"><button class="sort" type="button" (click)="sortBy('revenue')">Revenue</button></th>
              <th scope="col" class="num"><button class="sort" type="button" (click)="sortBy('commission_earned')">Commission</button></th>
              <th scope="col" class="num">Paid</th>
              <th scope="col" class="num"><button class="sort" type="button" (click)="sortBy('owed')">Owed now</button></th>
              <th scope="col">Report email</th>
            </tr>
          </thead>
          <tbody>
            @for (a of rows(); track a.id) {
              <tr class="open" (click)="open(a.id, $event)">
                <td>
                  <a [routerLink]="['/dashboard/referrals', a.id]" [queryParams]="{ month: month() }"><strong>{{ a.name }}</strong></a>
                  <br><span class="muted">{{ a.code }} · {{ rate(a.commission_rate) }}%</span>
                  @if (!a.is_active) { <span class="pill quiet">Paused</span> }
                  @if (!a.has_password) { <span class="pill warn">Invited</span> }
                </td>
                <td class="num">{{ a.figures.new_referrals }}</td>
                <td class="num">{{ a.figures.total_referrals }}</td>
                <td class="num">{{ a.figures.paying_customers }}</td>
                <td class="num">{{ money(a.figures.revenue) }}</td>
                <td class="num">{{ money(a.figures.commission_earned) }}</td>
                <td class="num">{{ money(a.figures.paid_out) }}</td>
                <td class="num" [class.neg]="+a.figures.owed < 0">{{ money(a.figures.owed) }}</td>
                <td>{{ sentTo(a.id) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="muted">No ambassadors yet.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <section class="panel emails">
        <div>
          <h2>Monthly emails</h2>
          <p class="muted">
            On the 1st of every month at 09:00 each ambassador gets their report for the month before, and super-admins
            get the revenue breakdown and what to send each ambassador.
          </p>
          <p>{{ adminEmailLine() }}</p>
        </div>
        @if (auth.isSuperAdmin()) {
          <button class="btn ghost small" type="button" [disabled]="resending()" (click)="resendAdmin()">
            {{ resending() ? 'Sending…' : 'Send the ' + monthName(month()) + ' summary to super-admins' }}
          </button>
        }
      </section>
    } @else if (!error()) {
      <div class="spinner"></div>
    }
  `,
  styles: `
    :host { display: grid; gap: 18px; }
    .page-head { margin-bottom: 0; }
    tr.open { cursor: pointer; }
    .head-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .month { width: auto; padding: 9px 12px; }
    .editor { padding: 22px; display: grid; gap: 14px; max-width: 760px; }
    .editor h2 { font-size: 18px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .full { grid-column: 1 / -1; }
    .hint { color: var(--muted); font-size: 12px; }
    .code { text-transform: uppercase; letter-spacing: 0.06em; }
    .row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    .figures {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; background: var(--line);
      border: 1px solid var(--line); border-radius: var(--radius-l); overflow: hidden;
    }
    .figure { background: var(--card); padding: 18px 20px; display: grid; gap: 6px; }
    .f-label { color: var(--muted); font-size: 14px; }
    .f-value { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .sort { background: none; border: 0; color: inherit; font: inherit; padding: 0; cursor: pointer; }
    .sort:hover { color: var(--text); }
    td a { color: var(--text); text-decoration: none; }
    td a:hover { color: var(--cyan); }
    .pill { margin-left: 6px; }
    .neg { color: var(--bad); }
    .muted { color: var(--muted); }
    .emails { padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .emails h2 { font-size: 16px; font-weight: 500; }
    .emails p { margin-top: 4px; max-width: 70ch; font-size: 14px; }
    @media (max-width: 900px) { .figures { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class ReferralsComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  /** The whole row opens the ambassador; the name stays a real link for the keyboard. */
  open(id: string, e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('a, button')) return;
    this.router.navigate(['/dashboard/referrals', id], { queryParams: { month: this.month() } });
  }

  readonly thisMonth = monthKey();
  month = signal(this.route.snapshot.queryParamMap.get('month') ?? previousMonthKey());
  data = signal<ReferralsOverview | null>(null);
  error = signal('');
  notice = signal('');
  sort = signal<SortKey>('revenue');
  downloading = signal(false);
  resending = signal(false);

  adding = signal(false);
  saving = signal(false);
  formErr = signal('');
  errors = signal<Record<string, string>>({});
  draft: NewAmbassador = this.blank();

  money = money;
  monthName = monthName;

  rows = computed<AmbassadorRow[]>(() => {
    const list = [...(this.data()?.ambassadors ?? [])];
    const key = this.sort();
    if (key === 'code') return list.sort((a, b) => a.code.localeCompare(b.code));
    return list.sort((a, b) => Number(b.figures[key]) - Number(a.figures[key]));
  });

  ngOnInit(): void {
    this.load();
  }

  private blank(): NewAmbassador {
    return { email: '', first_name: '', last_name: '', code: '', commission_rate: '20', payout_phone: '', notes: '' };
  }

  pickMonth(value: string): void {
    if (!value) return;
    this.month.set(value);
    this.router.navigate([], { queryParams: { month: value }, replaceUrl: true });
    this.load();
  }

  sortBy(key: SortKey): void {
    this.sort.set(key);
  }

  private load(): void {
    this.api
      .referrals(this.month())
      .then((d) => {
        this.data.set(d);
        this.error.set('');
      })
      .catch((err) => this.error.set(errorMessage(err, "Couldn't load referrals. Try again.")));
  }

  sentTo(ambassadorId: string): string {
    const sent = this.data()?.emails_sent.find((e) => e.kind === 'ambassador' && e.ambassador_id === ambassadorId);
    return sent ? `Sent ${dayTime(sent.sent_at)}` : '—';
  }

  adminEmailLine(): string {
    const sent = (this.data()?.emails_sent ?? []).filter((e) => e.kind === 'admin');
    if (!sent.length) return `The ${monthName(this.month())} summary hasn't been sent.`;
    return `The ${monthName(this.month())} summary went to ${sent.map((e) => e.to).join(', ')}.`;
  }

  rate(r: string): string {
    return String(Number(r));
  }

  startAdd(): void {
    this.draft = this.blank();
    this.errors.set({});
    this.formErr.set('');
    this.adding.set(true);
  }

  async add(): Promise<void> {
    this.saving.set(true);
    this.errors.set({});
    this.formErr.set('');
    try {
      const body = { ...this.draft, code: this.draft.code.trim().toUpperCase(), commission_rate: String(this.draft.commission_rate ?? '20') };
      const res = await this.api.addAmbassador(body);
      this.adding.set(false);
      this.notice.set(
        res.invited
          ? `${res.ambassador.email} is now an ambassador with the code ${res.ambassador.code}. We emailed them a link to choose a password.`
          : `${res.ambassador.email} is now an ambassador with the code ${res.ambassador.code}. We emailed them their code and a link to their page; they sign in with their existing password.`,
      );
      this.load();
    } catch (err) {
      this.errors.set(fieldErrors(err));
      this.formErr.set(Object.keys(fieldErrors(err)).length ? '' : errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  async download(): Promise<void> {
    this.downloading.set(true);
    try {
      await this.api.referralsReport(this.month());
    } catch (err) {
      this.error.set(errorMessage(err, "Couldn't prepare the workbook. Try again."));
    } finally {
      this.downloading.set(false);
    }
  }

  async resendAdmin(): Promise<void> {
    this.resending.set(true);
    try {
      await this.api.resendReport(this.month());
      this.notice.set(`The ${monthName(this.month())} summary is on its way to the super-admins.`);
      this.load();
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.resending.set(false);
    }
  }
}
