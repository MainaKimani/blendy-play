import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage, fieldErrors } from '../core/errors';
import { ago } from '../core/format';
import { Device, Issue, IssueCategory, NewIssue } from '../core/models';
import { issuePill } from '../shared/status';
import { deviceKind } from './devices.component';

/**
 * Help: the user's issues, and raising a new one. The device (and so the app
 * version) goes with the issue: picked from a list when more than one app is
 * signed in, attached by itself when there's one, left out when there's none.
 */
@Component({
  selector: 'bp-help',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="panel block">
      <div class="head">
        <div>
          <h2>Help</h2>
          <p class="muted">Tell us what's going wrong and we'll reply here. We'll also email you when we do.</p>
        </div>
        @if (!formOpen()) {
          <button class="btn" type="button" (click)="openForm()">Raise an issue</button>
        }
      </div>

      @if (formOpen()) {
        <form class="new" (ngSubmit)="raise()" novalidate>
          <label class="field">
            <span>What's it about?</span>
            <select class="input" name="category" [(ngModel)]="draft.category">
              @for (c of categories; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
            </select>
          </label>
          <label class="field">
            <span>Title</span>
            <input class="input" name="title" maxlength="120" placeholder="For example: Video stops after a few minutes"
                   [(ngModel)]="draft.title">
            @if (errors()['title']) { <span class="err">{{ errors()['title'] }}</span> }
          </label>
          @if (apps().length > 1) {
            <label class="field">
              <span>Which device?</span>
              <select class="input" name="device" [(ngModel)]="device">
                <option value="" disabled>Choose a device</option>
                @for (d of apps(); track d.id) {
                  <option [value]="d.id">{{ d.name || kind(d) }} ({{ kind(d) }})</option>
                }
                <option value="none">Not about a particular device</option>
              </select>
              @if (errors()['device']) { <span class="err">{{ errors()['device'] }}</span> }
            </label>
          } @else if (apps().length === 1) {
            <p class="hint">We'll include your device: {{ apps()[0].name || kind(apps()[0]) }} ({{ kind(apps()[0]) }}).</p>
          }
          <label class="field">
            <span>What happened?</span>
            <textarea class="input" name="body" rows="5" maxlength="4000"
                      placeholder="What you were doing, what you expected, and what happened instead."
                      [(ngModel)]="draft.body"></textarea>
            @if (errors()['body']) { <span class="err">{{ errors()['body'] }}</span> }
          </label>
          <div class="row">
            <button class="btn" type="submit" [disabled]="busy()">{{ busy() ? 'Sending…' : 'Send' }}</button>
            <button class="btn ghost" type="button" (click)="formOpen.set(false)">Cancel</button>
            @if (error()) { <span class="form-err" role="alert">{{ error() }}</span> }
          </div>
        </form>
      }

      @if (issues(); as list) {
        @if (list.length) {
          <ul class="list">
            @for (i of list; track i.id) {
              <li>
                <a [routerLink]="i.id">
                  <span class="title">
                    {{ i.title }}
                    @if (i.unread) { <span class="pill warn">New reply</span> }
                  </span>
                  <span class="meta">
                    <span class="pill {{ pill(i.status).tone }}">{{ pill(i.status).text }}</span>
                    {{ i.category_label }}@if (i.device_name) { · {{ i.device_name }}} · {{ ago(i.last_message_at) }}
                  </span>
                </a>
              </li>
            }
          </ul>
        } @else if (!formOpen()) {
          <p class="muted">No issues yet. If something isn't working, raise one and we'll help.</p>
        }
      } @else if (loadError()) {
        <p class="form-err" role="alert">{{ loadError() }}</p>
      } @else {
        <div class="spinner"></div>
      }
    </section>
  `,
  styles: `
    .block { padding: 24px; display: grid; gap: 18px; }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    h2 { font-size: 18px; }
    .muted { color: var(--muted); font-size: 14px; max-width: 66ch; margin-top: 4px; }
    .hint { color: var(--muted); font-size: 13px; }
    .new { display: grid; gap: 14px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: rgba(255, 255, 255, 0.015); }
    textarea { resize: vertical; }
    .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .list { list-style: none; margin: 0; padding: 0; display: grid; }
    li { border-bottom: 1px solid var(--line); }
    li:last-child { border-bottom: 0; }
    li a { display: grid; gap: 6px; padding: 14px 0; color: inherit; text-decoration: none; }
    li a:hover .title { color: var(--cyan); }
    .title { font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; overflow-wrap: anywhere; }
    .meta { color: var(--muted); font-size: 13px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  `,
})
export class HelpComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  issues = signal<Issue[] | null>(null);
  devices = signal<Device[]>([]);
  apps = computed(() => this.devices().filter((d) => d.kind === 'app'));
  formOpen = signal(false);
  busy = signal(false);
  error = signal('');
  loadError = signal('');
  errors = signal<Record<string, string>>({});

  categories: { value: IssueCategory; label: string }[] = [
    { value: 'playback', label: 'Playback' },
    { value: 'payment', label: 'Payment' },
    { value: 'account', label: 'Account' },
    { value: 'app', label: 'The app' },
    { value: 'other', label: 'Something else' },
  ];
  draft: { title: string; category: IssueCategory; body: string } = { title: '', category: 'playback', body: '' };
  device = '';

  kind = deviceKind;
  ago = ago;
  pill = (s: Issue['status']) => issuePill(s);

  async ngOnInit(): Promise<void> {
    try {
      this.issues.set(await this.api.myIssues());
    } catch (e) {
      this.loadError.set(errorMessage(e));
    }
  }

  async openForm(): Promise<void> {
    this.formOpen.set(true);
    this.error.set('');
    this.errors.set({});
    try {
      this.devices.set((await this.api.myDevices()).devices);
    } catch {
      this.devices.set([]); // the form still works, without a device
    }
  }

  async raise(): Promise<void> {
    const errs: Record<string, string> = {};
    if (this.draft.title.trim().length < 3) errs['title'] = 'Give it a short title.';
    if (!this.draft.body.trim()) errs['body'] = 'Tell us what happened.';
    if (this.apps().length > 1 && !this.device) errs['device'] = 'Choose the device, or "Not about a particular device".';
    this.errors.set(errs);
    if (Object.keys(errs).length) return;

    const body: NewIssue = { title: this.draft.title.trim(), category: this.draft.category, body: this.draft.body.trim() };
    if (this.apps().length > 1) body.device = this.device === 'none' ? null : this.device;
    this.busy.set(true);
    this.error.set('');
    try {
      const issue = await this.api.raiseIssue(body);
      this.router.navigate(['/account/help', issue.id]);
    } catch (e) {
      this.errors.set(fieldErrors(e));
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
