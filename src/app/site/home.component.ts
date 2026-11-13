import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ConfigService } from '../core/config.service';
import { Plan, Release } from '../core/models';
import { day, money } from '../core/format';

/** Shown until (or if) the backend's live plans load. */
const FALLBACK_PLANS: Plan[] = [
  { code: 'weekly', name: 'Weekly', interval: 'WEEK', currency: 'KES', price: '99.00', duration_days: 7 },
  { code: 'monthly', name: 'Monthly', interval: 'MONTH', currency: 'KES', price: '299.00', duration_days: 30 },
];

const ADS = [
  { text: 'You won KES 50,000! Claim now', cls: 'a1' },
  { text: 'Allow notifications?', cls: 'a2' },
  { text: 'DOWNLOAD NOW', cls: 'a3' },
  { text: 'Hot deals near you', cls: 'a4' },
  { text: 'Spin & win', cls: 'a5' },
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

  ads = ADS;
  plans = signal<Plan[]>(FALLBACK_PLANS);
  release = signal<Release | null>(null);
  /** Files that are really on the server; the rest show as coming soon. */
  available = signal<Set<string>>(new Set());
  run = signal(0);
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
          r.files.map((f) =>
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

  /** Restart the hero's ad-clearing sequence. */
  replay(): void {
    this.run.update((n) => n + 1);
  }

  pickDevice(d: 'phone' | 'tv' | 'desktop'): void {
    this.device.set(d);
    this.shot.set(0);
  }
}
