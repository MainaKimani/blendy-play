import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { change, day, dayTime, money } from '../core/format';
import { Overview } from '../core/models';
import { Bar, BarChartComponent } from '../shared/bar-chart.component';
import { paymentPill } from '../shared/status';

const PLAN_COLORS = ['var(--chart-cyan)', 'var(--chart-magenta)'];

@Component({
  selector: 'bp-overview',
  imports: [BarChartComponent, RouterLink],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<Overview | null>(null);
  error = signal('');
  days = signal(30);
  tables = signal<Record<string, boolean>>({});
  windows = [7, 30, 90];
  money = money;
  day = day;
  dayTime = dayTime;
  pill = paymentPill;

  revenueBars = computed<Bar[]>(() =>
    (this.data()?.series ?? []).map((d) => ({
      label: this.short(d.date),
      value: Number(d.revenue),
      display: money(d.revenue),
      detail: `${d.payments} payment${d.payments === 1 ? '' : 's'}`,
    })),
  );

  signupBars = computed<Bar[]>(() =>
    (this.data()?.series ?? []).map((d) => ({
      label: this.short(d.date),
      value: d.signups,
      display: `${d.signups} new user${d.signups === 1 ? '' : 's'}`,
    })),
  );

  figures = computed(() => {
    const t = this.data()?.totals;
    if (!t) return [];
    const settled = t.payments_succeeded + t.payments_failed;
    return [
      {
        label: 'Revenue',
        value: money(t.revenue),
        delta: change(Number(t.revenue), Number(t.revenue_previous)),
        note: `${money(t.revenue_all_time)} all time`,
      },
      { label: 'Active subscriptions', value: String(t.active_subscriptions), delta: null, note: `of ${t.users} customers` },
      {
        label: 'New users',
        value: String(t.new_users),
        delta: change(t.new_users, t.new_users_previous),
        note: `${t.new_users_previous} in the ${this.days()} days before`,
      },
      {
        label: 'Payments that went through',
        value: t.success_rate === null ? '—' : `${Math.round(t.success_rate * 100)}%`,
        delta: null,
        note: settled
          ? `${t.payments_succeeded} paid, ${t.payments_failed} failed or cancelled, ${t.payments_pending} waiting`
          : 'No finished payments in this period',
      },
    ];
  });

  planRows = computed(() => {
    const plans = this.data()?.plans ?? [];
    const max = Math.max(1, ...plans.map((p) => p.active_subscribers));
    return plans.map((p, i) => ({ ...p, pct: (p.active_subscribers / max) * 100, color: PLAN_COLORS[i % 2] }));
  });

  moneyTick = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));
  countTick = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  ngOnInit(): void {
    this.load(30);
  }

  load(days: number): void {
    this.days.set(days);
    this.error.set('');
    this.api.overview(days).then((d) => this.data.set(d)).catch((e) => this.error.set(errorMessage(e)));
  }

  toggleTable(key: string): void {
    this.tables.update((t) => ({ ...t, [key]: !t[key] }));
  }

  deltaTone(d: string | null): string {
    if (!d || d === 'new') return 'up';
    return d.startsWith('-') ? 'down' : d === '+0%' ? 'flat' : 'up';
  }

  private short(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
}
