import { Component, OnDestroy, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { day } from '../core/format';
import { Issue } from '../core/models';
import { IssueThreadComponent } from '../shared/issue-thread.component';
import { issuePill } from '../shared/status';

/** How often an open issue checks for the team's replies, while the tab is visible. */
export const ISSUE_POLL_MS = 15000;

/** One of the user's issues: the conversation, a reply box, and "Mark resolved". */
@Component({
  selector: 'bp-help-issue',
  imports: [RouterLink, IssueThreadComponent],
  template: `
    <section class="panel block">
      <a class="back" routerLink="/account/help">← All issues</a>
      @if (issue(); as i) {
        <div class="head">
          <div>
            <h2>{{ i.title }}</h2>
            <p class="meta">
              <span class="pill {{ pill(i.status).tone }}">{{ pill(i.status).text }}</span>
              {{ i.category_label }}
              @if (i.device_name) { · {{ i.device_name }}@if (i.app_version) {, version {{ i.app_version }}} }
              · raised {{ day(i.created_at) }}
            </p>
          </div>
          @if (i.status !== 'resolved') {
            <button class="btn ghost small" type="button" [disabled]="resolving()" (click)="resolve()">
              {{ resolving() ? 'Saving…' : 'Mark resolved' }}
            </button>
          }
        </div>
        @if (i.status === 'resolved') {
          <p class="muted">This issue is resolved. If it's back, reply and we'll pick it up again.</p>
        }
        <bp-issue-thread [messages]="i.messages ?? []" [busy]="sending()" [error]="sendError()"
                         [label]="i.status === 'resolved' ? 'Reopen with a reply' : 'Reply'" (send)="reply($event)" />
      } @else if (error()) {
        <p class="form-err" role="alert">{{ error() }}</p>
      } @else {
        <div class="spinner"></div>
      }
    </section>
  `,
  styles: `
    .block { padding: 24px; display: grid; gap: 16px; }
    .back { color: var(--muted); font-size: 14px; text-decoration: none; width: fit-content; }
    .back:hover { color: var(--cyan); }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    h2 { font-size: 18px; overflow-wrap: anywhere; }
    .meta { color: var(--muted); font-size: 13px; margin-top: 6px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .muted { color: var(--muted); font-size: 14px; }
  `,
})
export class HelpIssueComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  id = input.required<string>();

  issue = signal<Issue | null>(null);
  error = signal('');
  sending = signal(false);
  sendError = signal('');
  resolving = signal(false);
  private thread = viewChild(IssueThreadComponent);
  private timer?: ReturnType<typeof setInterval>;

  day = day;
  pill = (s: Issue['status']) => issuePill(s);

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
      this.issue.set(await this.api.myIssue(this.id()));
    } catch (e) {
      if (!quiet) this.error.set(errorMessage(e));
    }
  }

  async reply(body: string): Promise<void> {
    this.sending.set(true);
    this.sendError.set('');
    try {
      await this.api.replyToIssue(this.id(), body);
      this.thread()?.clear();
      await this.load();
    } catch (e) {
      this.sendError.set(errorMessage(e));
    } finally {
      this.sending.set(false);
    }
  }

  async resolve(): Promise<void> {
    this.resolving.set(true);
    try {
      await this.api.resolveIssue(this.id());
      await this.load();
    } catch (e) {
      this.sendError.set(errorMessage(e));
    } finally {
      this.resolving.set(false);
    }
  }
}
