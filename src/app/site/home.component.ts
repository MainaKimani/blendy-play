import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ConfigService } from '../core/config.service';
import { Plan, Release, ReleaseFile, ReleasePlatform } from '../core/models';
import { day, money } from '../core/format';

/** When the glass over the downloads breaks: midnight at the start of 18 November 2026, Nairobi time. */
const GLASS_BREAKS_AT = Date.parse('2026-11-18T00:00:00+03:00');
/** How long the shatter plays before the glass is removed. */
const SHATTER_MS = 1600;

/**
 * The glass is a fan of triangles meeting at the centre, so it can fly apart along the cracks.
 * Each shard knows its clip path, which way it falls, and where its crack meets the edge.
 */
const SHARDS = (() => {
  // Irregular points round the edge, in percent, clockwise from the top-left corner.
  const edge: [number, number][] = [
    [0, 0], [22, 0], [47, 0], [71, 0], [100, 0], [100, 28], [100, 61], [100, 100],
    [78, 100], [53, 100], [27, 100], [0, 100], [0, 66], [0, 31],
  ];
  const c: [number, number] = [50, 50];
  return edge.map((a, i) => {
    const b = edge[(i + 1) % edge.length];
    const mx = (a[0] + b[0] + c[0]) / 3 - 50;
    const my = (a[1] + b[1] + c[1]) / 3 - 50;
    const len = Math.hypot(mx, my) || 1;
    return {
      clip: `polygon(${c[0]}% ${c[1]}%, ${a[0]}% ${a[1]}%, ${b[0]}% ${b[1]}%)`,
      dx: `${((mx / len) * 60).toFixed(0)}vw`,
      dy: `${((my / len) * 40 + 30).toFixed(0)}vh`,
      rot: `${(i % 2 ? 1 : -1) * (25 + ((i * 37) % 50))}deg`,
      delay: `${(i * 23) % 120}ms`,
      edgeX: a[0],
      edgeY: a[1],
    };
  });
})();

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

  shards = SHARDS;
  private now = signal(Date.now());
  /** 'sealed' while counting down, 'breaking' while the shatter plays, then 'gone'. */
  glass = signal<'sealed' | 'breaking' | 'gone'>(Date.now() >= GLASS_BREAKS_AT ? 'gone' : 'sealed');
  countdown = computed(() => {
    const left = Math.max(0, Math.ceil((GLASS_BREAKS_AT - this.now()) / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    return { h: pad(Math.floor(left / 3600)), m: pad(Math.floor(left / 60) % 60), s: pad(left % 60) };
  });
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

  constructor() {
    if (this.glass() === 'gone') return;
    const tick = setInterval(() => {
      this.now.set(Date.now());
      if (this.now() < GLASS_BREAKS_AT) return;
      clearInterval(tick);
      this.glass.set('breaking');
      setTimeout(() => this.glass.set('gone'), SHATTER_MS);
    }, 250);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
  }

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
