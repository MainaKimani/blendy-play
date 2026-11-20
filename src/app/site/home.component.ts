import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService, homePath } from '../core/auth.service';
import { ConfigService } from '../core/config.service';
import { Plan, Release, ReleaseFile, ReleasePlatform } from '../core/models';
import { day, money } from '../core/format';
import { TriviaQuestion, environment } from '../../environments/environment';

/** When the glass over the downloads breaks: midnight at the start of 18 November 2026, Nairobi time. */
const GLASS_BREAKS_AT = Date.parse('2026-11-18T00:00:00+03:00');
/** How long the shatter plays before the glass is removed. */
const SHATTER_MS = 1600;
/** Trivia: three questions a try, 15 seconds each, and a minute's wait after a miss. */
const QUIZ_LENGTH = 3;
const QUESTION_MS = 15_000;
const COOLDOWN_MS = 60_000;
/** How long a card that ran out of time stays up, glowing red, before the next one. */
const TIMEOUT_HOLD_MS = 1500;
/** Browser storage keys: a visitor who broke the glass early, and when a visitor may try again. */
const BROKEN_KEY = 'bp-glass-broken';
const RETRY_KEY = 'bp-glass-retry-at';

function stored(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function store(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* private mode: the state just won't survive a reload */ }
}
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** Three random questions, each with its choices shuffled and the right one remembered by text. */
function drawQuiz(): { q: string; options: string[]; right: string }[] {
  return shuffle(environment.trivia).slice(0, QUIZ_LENGTH).map((t: TriviaQuestion) => ({
    q: t.q,
    options: shuffle(t.options),
    right: t.options[t.answer],
  }));
}

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
  glass = signal<'sealed' | 'breaking' | 'gone'>(
    Date.now() >= GLASS_BREAKS_AT || stored(BROKEN_KEY) ? 'gone' : 'sealed',
  );
  countdown = computed(() => {
    const left = Math.max(0, Math.ceil((GLASS_BREAKS_AT - this.now()) / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    return { h: pad(Math.floor(left / 3600)), m: pad(Math.floor(left / 60) % 60), s: pad(left % 60) };
  });
  kinds = ['Blockbusters', 'Series', 'Kids & family', 'Anime', 'Documentaries'];
  money = money;
  day = day;
  homePath = homePath;

  /** The downloads in a fixed order: phones and TVs first, then desktop. */
  files = computed<(ReleaseFile & { platform: ReleasePlatform })[]>(() => {
    const p = this.release()?.platforms ?? {};
    return (['android', 'windows', 'linux'] as const).filter((k) => p[k]).map((k) => ({ ...p[k]!, platform: k }));
  });

  sizeLabel(bytes: number): string {
    return bytes ? `${Math.max(1, Math.round(bytes / 1048576))} MB` : '';
  }

  /** "a week", "a month", or "for 24 hours" for a day pass. */
  per(p: Plan): string {
    return { DAY: 'for 24 hours', WEEK: 'a week', MONTH: 'a month' }[p.interval] ?? '';
  }

  cheapestPerDay = computed(() => {
    const per = this.plans().map((p) => Number(p.price) / (p.duration_days ?? ({ DAY: 1, WEEK: 7, MONTH: 30 }[p.interval] ?? 30)));
    return Math.round(Math.min(...per));
  });

  /**
   * The early-break trivia: 'idle' offers it, 'asking' runs the three timed cards, 'missed' shakes
   * the card and makes the visitor wait a minute. Answers are only judged after the third card,
   * and a miss doesn't say which one was wrong.
   */
  quizState = signal<'idle' | 'asking' | 'missed'>(Number(stored(RETRY_KEY)) > Date.now() ? 'missed' : 'idle');
  quiz = signal<{ q: string; options: string[]; right: string }[]>([]);
  quizStep = signal(0);
  picked = signal<string | null>(null);
  private answers: (string | null)[] = [];
  /** The current card ran out of time: it glows red and takes no more answers. */
  timedOut = signal(false);
  /** After a miss: each question answered wrongly (or not at all), with the right answer. */
  review = signal<{ q: string; given: string | null; right: string }[]>([]);
  private questionEndsAt = 0;
  private retryAt = Number(stored(RETRY_KEY)) || 0;
  shake = signal(false);
  questionLeft = computed(() => Math.max(0, Math.ceil((this.questionEndsAt - this.now()) / 1000)));
  /** 1 when a card starts, 0 when its time is up; drives the bar under the question. */
  questionFill = computed(() => Math.max(0, Math.min(1, (this.questionEndsAt - this.now()) / QUESTION_MS)));
  retryLeft = computed(() => Math.max(0, Math.ceil((this.retryAt - this.now()) / 1000)));

  constructor() {
    if (this.glass() === 'gone') return;
    const tick = setInterval(() => {
      this.now.set(Date.now());
      if (this.glass() !== 'sealed') return clearInterval(tick);
      if (this.now() >= GLASS_BREAKS_AT) return this.breakGlass();
      if (this.quizState() === 'asking' && !this.timedOut() && this.now() >= this.questionEndsAt) this.runOut();
      if (this.quizState() === 'missed' && this.now() >= this.retryAt) this.quizState.set('idle');
    }, 250);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
  }

  startQuiz(): void {
    this.quiz.set(drawQuiz());
    this.answers = [];
    this.showQuestion(0);
    this.quizState.set('asking');
  }

  /** OK on a card: record the choice and move on. */
  confirmAnswer(): void {
    if (this.quizState() !== 'asking' || this.timedOut()) return;
    this.answers.push(this.picked());
    this.advance();
  }

  /** Time's up on a card: it counts as unanswered, glows red for a moment, then moves on. */
  private runOut(): void {
    this.timedOut.set(true);
    this.answers.push(null);
    setTimeout(() => {
      this.timedOut.set(false);
      if (this.quizState() === 'asking') this.advance();
    }, TIMEOUT_HOLD_MS);
  }

  private advance(): void {
    const next = this.quizStep() + 1;
    if (next < QUIZ_LENGTH) return this.showQuestion(next);
    const allRight = this.quiz().every((item, i) => this.answers[i] === item.right);
    if (allRight) {
      store(BROKEN_KEY, '1');
      this.breakGlass();
      return;
    }
    this.review.set(
      this.quiz()
        .map((item, i) => ({ q: item.q, given: this.answers[i], right: item.right }))
        .filter((r) => r.given !== r.right),
    );
    this.retryAt = Date.now() + COOLDOWN_MS;
    store(RETRY_KEY, String(this.retryAt));
    this.now.set(Date.now());
    this.quizState.set('missed');
    this.shake.set(true);
    setTimeout(() => this.shake.set(false), 600);
  }

  private showQuestion(i: number): void {
    this.quizStep.set(i);
    this.picked.set(null);
    this.questionEndsAt = Date.now() + QUESTION_MS;
    this.now.set(Date.now());
  }

  private breakGlass(): void {
    if (this.glass() !== 'sealed') return;
    this.glass.set('breaking');
    setTimeout(() => this.glass.set('gone'), SHATTER_MS);
  }

  /** An ambassador's code from ?ref=, kept for this browser so it survives moving around the site. */
  referralCode = signal<string | null>(null);
  referralCopied = signal(false);

  private readReferral(): void {
    const fromUrl = (new URLSearchParams(location.search).get('ref') ?? '').replace(/\s+/g, '').toUpperCase();
    let code = /^[A-Z0-9]{4,20}$/.test(fromUrl) ? fromUrl : '';
    try {
      if (code) localStorage.setItem('bp-ref', code);
      else code = localStorage.getItem('bp-ref') ?? '';
    } catch { /* storage blocked: the code still shows on this visit */ }
    if (!code) return;
    this.api
      .checkReferralCode(code)
      .then((r) => {
        if (r.valid) this.referralCode.set(code);
        else try { localStorage.removeItem('bp-ref'); } catch { /* ignore */ }
      })
      .catch(() => {});
  }

  copyReferral(code: string): void {
    navigator.clipboard?.writeText(code).then(() => {
      this.referralCopied.set(true);
      setTimeout(() => this.referralCopied.set(false), 1800);
    });
  }

  ngOnInit(): void {
    this.auth.ensureMe();
    this.readReferral();
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
