import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/errors';
import { day, money, phone } from '../core/format';
import { AdminUser, Page } from '../core/models';
import { PagerComponent } from '../shared/pager.component';
import { subscriptionPill } from '../shared/status';
import { ListBase } from './list-base';

@Component({
  selector: 'bp-users',
  imports: [RouterLink, PagerComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Users</h1>
        <p>{{ data()?.count ?? '…' }} customer accounts. Admin and staff accounts aren't listed.</p>
      </div>
    </div>
    <div class="toolbar">
      <input class="input" type="search" placeholder="Search name, email or phone" aria-label="Search users"
             [value]="search()" (input)="onSearch($any($event.target).value)">
      <div class="chips" role="group" aria-label="Filter by subscription">
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
              <tr>
                <th scope="col">Customer</th><th scope="col">Phone</th><th scope="col">Subscription</th>
                <th scope="col">Ends</th><th scope="col" class="num">Paid in total</th><th scope="col">CineJoy</th><th scope="col">Joined</th><th scope="col"><span class="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (u of d.results; track u.id) {
                <tr class="open" (click)="open(u.id, $event)">
                  <td><a [routerLink]="u.id"><strong>{{ u.name || u.email }}</strong></a>@if (u.name) {<br><span class="muted">{{ u.email }}</span>}</td>
                  <td>{{ phone(u.phone_number) }}</td>
                  <td><span class="pill {{ u.subscription.lifetime ? 'ok' : pill(u.subscription.state).tone }}">{{ u.subscription.lifetime ? 'Lifetime' : pill(u.subscription.state).text }}</span>
                    @if (u.subscription.plan) { <span class="muted plan">{{ u.subscription.plan }}</span> }</td>
                  <td>{{ u.subscription.lifetime ? 'Never' : day(u.subscription.current_period_end) }}</td>
                  <td class="num">{{ money(u.total_paid) }}</td>
                  <td>{{ u.has_cinejoy_account ? 'Saved' : '—' }}</td>
                  <td>{{ day(u.created_at) }}</td>
                  <td class="go"><a class="btn ghost small" [routerLink]="u.id">{{ auth.isSuperAdmin() ? 'Edit' : 'View' }}</a></td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="empty">{{ search() || filter() ? 'No users match this search.' : 'No customers yet.' }}</p>
        }
      </div>
      <bp-pager [page]="page()" [count]="d.count" [size]="25" (go)="load($event)" />
    } @else if (!error()) {
      <div class="spinner"></div>
    }
  `,
  styles: `
    tr.open { cursor: pointer; }
    .go { text-align: right; }
  `,
})
export class UsersComponent extends ListBase<Page<AdminUser>> implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  auth = inject(AuthService);
  filters = [
    { value: '', label: 'Everyone' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'none', label: 'Never subscribed' },
    { value: 'lifetime', label: 'Lifetime' },
  ];
  money = money;
  day = day;
  phone = phone;
  pill = subscriptionPill;

  ngOnInit(): void {
    this.load(1);
  }

  /** A click anywhere on a row opens that customer; links inside it work as usual. */
  open(id: string, e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('a, button')) return;
    this.router.navigate(['/dashboard/users', id]);
  }

  protected fetch(q: Record<string, string | number>) {
    return this.api.users(q);
  }

  protected message(e: unknown): string {
    return errorMessage(e);
  }
}
