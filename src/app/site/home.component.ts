import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ConfigService } from '../core/config.service';
import { Plan, Release, ReleaseFile, ReleasePlatform } from '../core/models';
import { day, money } from '../core/format';

/** Shown until (or if) the backend's live plans load. */
const FALLBACK_PLANS: Plan[] = [
  { code: 'weekly', name: 'Weekly', interval: 'WEEK', currency: 'KES', price: '149.00', duration_days: 7 },
  { code: 'monthly', name: 'Monthly', interval: 'MONTH', currency: 'KES', price: '459.00', duration_days: 30 },
];

@Component({
  selector: 'bp-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  auth = inject(AuthService);
  config = inject(ConfigService);

  plans = signal<Plan[]>(FALLBACK_PLANS);
  release = signal<Release | null>(null);
  /** Files that are really on the server; the rest show as coming soon. */
  available = signal<Set<string>>(new Set());
  shots = signal<Record<string, { src: string; caption: string }[]>>({});
  device = signal<'phone' | 'tv' | 'desktop'>('phone');
  shot = signal(0);
  deviceList = [
    { key: 'phone' as const, label: 'Phone' },
    { key: 'tv' as const, label: 'TV' },
    { key: 'desktop' as const, label: 'Desktop' },
  ];
  year = new Date().getFullYear();
  money = money;
  day = day;

  /** The downloads in a fixed order: phones and TVs first, then desktop. */
  files = computed<(ReleaseFile & { platform: ReleasePlatform })[]>(() => {
    const p = this.release()?.platforms ?? {};
    return (['android', 'windows', 'linux'] as const).filter((k) => p[k]).map((k) => ({ ...p[k]!, platform: k }));
  });

  sizeLabel(bytes: number): string {
    return bytes ? `${Math.max(1, Math.round(bytes / 1048576))} MB` : '';
  }

  cheapestPerDay = computed(() => {
    const per = this.plans().map((p) => Number(p.price) / (p.duration_days ?? (p.interval === 'WEEK' ? 7 : 30)));
    return Math.round(Math.min(...per));
  });

  ngOnInit(): void {
    this.auth.ensureMe();
    firstValueFrom(this.http.get<Record<string, { src: string; caption: string }[]>>('/screenshots/screenshots.json'))
      .then((s) => this.shots.set(s))
      .catch(() => {});
    this.api.plans().then((p) => p.length && this.plans.set(p)).catch(() => {});
    this.api
      .releases()
      .then(async (r) => {
        this.release.set(r);
        const found = new Set<string>();
        await Promise.all(
          this.files().map((f) =>
            firstValueFrom(this.http.head(`/downloads/${f.file}`, { observe: 'response', responseType: 'text' }))
              .then((res) => {
                // SPA hosts answer unknown paths with index.html; only a non-HTML file counts.
                if (!(res.headers.get('content-type') ?? '').includes('text/html')) found.add(f.file);
              })
              .catch(() => {}),
          ),
        );
        this.available.set(found);
      })
      .catch(() => {});
  }

  pickDevice(d: 'phone' | 'tv' | 'desktop'): void {
    this.device.set(d);
    this.shot.set(0);
  }
}
