import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { day } from '../core/format';
import { AdminSubscription, Page } from '../core/models';
import { PagerComponent } from '../shared/pager.component';
import { subscriptionPill } from '../shared/status';
import { ListBase } from './list-base';

type SubPage = Page<AdminSubscription> & { state_counts: Record<string, number> };

@Component({
  selector: 'bp-subscriptions',
  imports: [RouterLink, PagerComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Subscriptions</h1>
        <p>One per customer. Paying again extends the same subscription.</p>
      </div>
    </div>
    <div class="toolbar">
      <input class="input" type="search" placeholder="Search email" aria-label="Search subscriptions"
             [value]="search()" (input)="onSearch($any($event.target).value)">
      <div class="chips" role="group" aria-label="Filter by state">
        @for (f of filters; track f.value) {
          <button type="button" class="chip" [class.on]="filter() === f.value" [attr.aria-pressed]="filter() === f.value" (click)="setFilter(f.value)">
            {{ f.label }}@if (f.value && data()?.state_counts) {<span class="n">{{ data()!.state_counts[f.value.toUpperCase()] }}</span>}
          </button>
        }
      </div>
    </div>
    @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }
    @if (data(); as d) {
      <div class="dt-wrap">
        @if (d.results.length) {
          <table class="dt">
            <thead>
              <tr><th scope="col">Customer</th><th scope="col">Plan</th><th scope="col">State</th><th scope="col">Started</th>
                <th scope="col">Ends</th><th scope="col">Last change</th></tr>
            </thead>
            <tbody>
              @for (s of d.results; track s.id) {
                <tr>
                  <td><a [routerLink]="['/dashboard/users', s.user.id]">{{ s.user.email }}</a></td>
                  <td>{{ s.plan ?? '—' }}</td>
                  <td><span class="pill {{ pill(s.state).tone }}">{{ pill(s.state).text }}</span></td>
                  <td>{{ day(s.started_at) }}</td>
                  <td>{{ day(s.current_period_end) }}</td>
                  <td class="muted">{{ day(s.updated_at) }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="empty">{{ search() || filter() ? 'No subscriptions match this search.' : 'No subscriptions yet.' }}</p>
        }
      </div>
      <bp-pager [page]="page()" [count]="d.count" [size]="25" (go)="load($event)" />
    } @else if (!error()) {
      <div class="spinner"></div>
    }
  `,
})
export class SubscriptionsComponent extends ListBase<SubPage> implements OnInit {
  private api = inject(ApiService);
  filters = [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'pending', label: 'Pending' },
  ];
  day = day;
  pill = subscriptionPill;

  ngOnInit(): void {
    this.load(1);
  }

  protected fetch(q: Record<string, string | number>) {
    return this.api.subscriptions(q);
  }

  protected message(e: unknown): string {
    return errorMessage(e);
  }
}
