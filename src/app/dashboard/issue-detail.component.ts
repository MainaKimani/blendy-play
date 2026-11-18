import { Component, OnDestroy, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { day } from '../core/format';
import { Issue, IssueStatus } from '../core/models';
import { ISSUE_POLL_MS } from '../account/help-issue.component';
import { IssueThreadComponent } from '../shared/issue-thread.component';
import { issuePill } from '../shared/status';

/** One issue, from the team's side: the conversation, a reply, and its status. */
@Component({
  selector: 'bp-issue-detail',
  imports: [RouterLink, IssueThreadComponent],
  template: `
    <a class="back" routerLink="/dashboard/issues">← Issues</a>
    @if (issue(); as i) {
      <div class="page-head">
        <div>
          <h1>{{ i.title }}</h1>
          <p class="meta">
            <span class="pill {{ pill(i.status).tone }}">{{ pill(i.status).text }}</span>
            {{ i.category_label }} · raised {{ day(i.created_at) }} by
            <a [routerLink]="['/dashboard/users', i.user?.id]">{{ i.user?.name }}</a>
          </p>
          <p class="meta">
            @if (i.device_name) {
              {{ i.device_name }}@if (i.platform) {, {{ i.platform }}}@if (i.app_version) {, version {{ i.app_version }}}
            } @else { No device attached }
          </p>
        </div>
        <div class="status" role="group" aria-label="Status">
          @for (s of statuses; track s.value) {
            <button type="button" class="chip" [class.on]="i.status === s.value" [attr.aria-pressed]="i.status === s.value"
                    [disabled]="saving()" (click)="setStatus(s.value)">{{ s.label }}</button>
          }
        </div>
      </div>
      <section class="panel block">
        <bp-issue-thread [messages]="i.messages ?? []" [staffSide]="true" [busy]="sending()" [error]="sendError()"
                         label="Reply to the customer (they're emailed)" (send)="reply($event)" />
      </section>
    } @else if (error()) {
      <p class="form-err" role="alert">{{ error() }}</p>
    } @else {
      <div class="spinner"></div>
    }
  `,
  styles: `
    :host { display: grid; gap: 16px; }
    .back { color: var(--muted); font-size: 14px; text-decoration: none; width: fit-content; }
    .back:hover { color: var(--cyan); }
    h1 { overflow-wrap: anywhere; }
    .meta { color: var(--muted); font-size: 14px; margin-top: 6px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .status { display: flex; gap: 8px; flex-wrap: wrap; }
    .block { padding: 20px; }
  `,
})
export class IssueDetailComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  id = input.required<string>();

  issue = signal<Issue | null>(null);
  error = signal('');
  sending = signal(false);
  sendError = signal('');
  saving = signal(false);
  private thread = viewChild(IssueThreadComponent);
  private timer?: ReturnType<typeof setInterval>;

  statuses: { value: IssueStatus; label: string }[] = [
    { value: 'open', label: 'Needs a reply' },
    { value: 'waiting', label: 'Waiting on customer' },
    { value: 'resolved', label: 'Resolved' },
  ];
  day = day;
  pill = (s: IssueStatus) => issuePill(s, true);

  ngOnInit(): void {
    this.load();
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible') this.load(true);
    }, ISSUE_POLL_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  async load(quiet = false): Promise<void> {
    try {
      this.issue.set(await this.api.issue(this.id()));
    } catch (e) {
      if (!quiet) this.error.set(errorMessage(e));
    }
  }

  async reply(body: string): Promise<void> {
    this.sending.set(true);
    this.sendError.set('');
    try {
      await this.api.answerIssue(this.id(), body);
      this.thread()?.clear();
      await this.load();
    } catch (e) {
      this.sendError.set(errorMessage(e));
    } finally {
      this.sending.set(false);
    }
  }

  async setStatus(status: IssueStatus): Promise<void> {
    this.saving.set(true);
    try {
      await this.api.setIssueStatus(this.id(), status);
      await this.load();
    } catch (e) {
      this.sendError.set(errorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }
}
