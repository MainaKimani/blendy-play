import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/errors';
import { ago, day } from '../core/format';
import { Device, MyDevices } from '../core/models';

const PLATFORMS: Record<string, string> = {
  android: 'Android app',
  windows: 'Windows app',
  linux: 'Linux app',
  web: 'Website',
};

/** "Android app 1.6.0", "Website". */
export function deviceKind(d: Device): string {
  const what = PLATFORMS[d.platform] ?? 'App';
  return d.app_version ? `${what} ${d.app_version}` : what;
}

@Component({
  selector: 'bp-devices',
  template: `
    <section class="panel block">
      <h2>Devices</h2>
      @if (data(); as d) {
        @if (d.limit !== null) {
          <p class="muted">
            Your account can be signed in on up to {{ d.limit }} apps at once (phones, TVs and computers).
            Signing in on this website doesn't count. To use Blendy Play on another device when all
            {{ d.limit }} are taken, sign one out here.
          </p>
          <p class="count" [class.full]="d.apps_signed_in >= d.limit">
            {{ d.apps_signed_in }} of {{ d.limit }} apps signed in
          </p>
        }

        <h3>Apps</h3>
        @if (apps().length) {
          <ul class="list">
            @for (dev of apps(); track dev.id) {
              <ng-container *ngTemplateOutlet="row; context: { $implicit: dev }" />
            }
          </ul>
        } @else {
          <p class="muted">No apps are signed in.</p>
        }

        @if (browsers().length) {
          <h3>Browsers</h3>
          <ul class="list">
            @for (dev of browsers(); track dev.id) {
              <ng-container *ngTemplateOutlet="row; context: { $implicit: dev }" />
            }
          </ul>
        }
        @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }
      } @else if (error()) {
        <p class="form-err" role="alert">{{ error() }}</p>
      } @else {
        <div class="spinner"></div>
      }
    </section>

    <ng-template #row let-dev>
      <li>
        <div class="what">
          <p class="name">
            {{ dev.name || kind(dev) }}
            @if (dev.current) { <span class="pill ok">This device</span> }
          </p>
          <p class="meta">{{ kind(dev) }}. Last active {{ ago(dev.last_seen_at) }}, signed in {{ day(dev.signed_in_at) }}.</p>
        </div>
        <button class="btn ghost small" type="button" [disabled]="busy() === dev.id" (click)="signOut(dev)">
          {{ busy() === dev.id ? 'Signing out…' : 'Sign out' }}
        </button>
      </li>
    </ng-template>
  `,
  imports: [NgTemplateOutlet],
  styles: `
    .block { padding: 24px; display: grid; gap: 14px; }
    h2 { font-size: 18px; }
    h3 { font-size: 15px; margin-top: 8px; }
    .muted { color: var(--muted); font-size: 14px; max-width: 66ch; }
    .count { font-weight: 600; }
    .count.full { color: #ffb3bd; }
    .list { list-style: none; margin: 0; padding: 0; display: grid; }
    li {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 14px 0; border-bottom: 1px solid var(--line);
    }
    li:last-child { border-bottom: 0; }
    .what { min-width: 0; }
    .name { font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; overflow-wrap: anywhere; }
    .meta { color: var(--muted); font-size: 14px; margin-top: 2px; }
    .btn { flex-shrink: 0; }
  `,
})
export class DevicesComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  data = signal<MyDevices | null>(null);
  error = signal('');
  busy = signal<string | null>(null);
  apps = computed(() => (this.data()?.devices ?? []).filter((d) => d.kind === 'app'));
  browsers = computed(() => (this.data()?.devices ?? []).filter((d) => d.kind !== 'app'));

  kind = deviceKind;
  ago = ago;
  day = day;

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    try {
      this.data.set(await this.api.myDevices());
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  async signOut(dev: Device): Promise<void> {
    this.busy.set(dev.id);
    this.error.set('');
    try {
      await this.api.signOutDevice(dev.id);
      if (dev.current) {
        this.auth.signOut('/');
        return;
      }
      await this.load();
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(null);
    }
  }
}
