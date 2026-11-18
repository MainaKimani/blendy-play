import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { ago } from '../core/format';
import { Issue, Page } from '../core/models';
import { PagerComponent } from '../shared/pager.component';
import { issuePill } from '../shared/status';
import { ListBase } from './list-base';

/** Help issues from customers. Every staff member can answer them. */
@Component({
  selector: 'bp-issues',
  imports: [RouterLink, PagerComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Issues</h1>
        <p>What customers raised under Help. A reply emails them; they answer on their account page.</p>
      </div>
    </div>
    <div class="toolbar">
      <input class="input" type="search" placeholder="Search title or email" aria-label="Search issues"
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
              <tr>
                <th scope="col">Issue</th><th scope="col">Customer</th><th scope="col">Status</th>
                <th scope="col">Device</th><th scope="col">Last message</th>
              </tr>
            </thead>
            <tbody>
              @for (i of d.results; track i.id) {
                <tr class="open" (click)="open(i.id, $event)">
                  <td><a [routerLink]="i.id"><strong>{{ i.title }}</strong></a>
                    @if (i.unread) { <span class="pill warn">New</span> }
                    <br><span class="muted">{{ i.category_label }}</span></td>
                  <td>{{ i.user?.name }}@if (i.user?.name !== i.user?.email) {<br><span class="muted">{{ i.user?.email }}</span>}</td>
                  <td><span class="pill {{ pill(i.status).tone }}">{{ pill(i.status).text }}</span></td>
                  <td>{{ i.device_name || '—' }}@if (i.app_version) {<br><span class="muted">{{ i.platform }} {{ i.app_version }}</span>}</td>
                  <td>{{ ago(i.last_message_at) }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="empty">{{ search() || filter() ? 'No issues match.' : 'No issues yet.' }}</p>
        }
      </div>
      <bp-pager [page]="page()" [count]="d.count" [size]="25" (go)="load($event)" />
    } @else if (!error()) {
      <div class="spinner"></div>
    }
  `,
  styles: `
    tr.open { cursor: pointer; }
    .pill { margin-left: 6px; }
  `,
})
export class IssuesComponent extends ListBase<Page<Issue>> implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  protected override filterKey = 'status';
  filters = [
    { value: 'open', label: 'Needs a reply' },
    { value: 'waiting', label: 'Waiting on customer' },
    { value: 'resolved', label: 'Resolved' },
    { value: '', label: 'All' },
  ];
  ago = ago;
  pill = (s: Issue['status']) => issuePill(s, true);

  ngOnInit(): void {
    this.filter.set('open');
    this.load(1);
  }

  open(id: string, e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('a, button')) return;
    this.router.navigate(['/dashboard/issues', id]);
  }

  protected fetch(q: Record<string, string | number>) {
    return this.api.issues(q);
  }

  protected message(e: unknown): string {
    return errorMessage(e);
  }
}
