import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Terms } from '../core/models';

/**
 * The live Terms and Conditions, the same text the apps show before payment.
 * They're edited in the backend's Django admin; nothing here needs a rebuild.
 * The html arrives escaped by the backend and Angular sanitises it again.
 */
@Component({
  selector: 'bp-terms',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <a class="brand" routerLink="/" aria-label="Blendy Play home">
        <img src="brand/mark.png" alt="" width="64" height="64">
        <span class="neon-text">Blendy Play</span>
      </a>
      <article class="panel doc">
        <h1>Terms and Conditions</h1>
        @if (terms(); as t) {
          <p class="updated"><strong>Last updated:</strong> {{ updated(t) }}</p>
          <div class="body" [innerHTML]="t.html"></div>
        } @else if (failed()) {
          <p class="sub" role="alert">The Terms and Conditions couldn't be loaded. Try again in a moment.</p>
        } @else {
          <p class="sub" role="status">Loading…</p>
        }
      </article>
      <a class="back" routerLink="/">Back to Blendy Play</a>
    </main>
  `,
  styles: `
    .wrap { display: grid; justify-items: center; gap: 22px; padding: 32px 16px 48px; }
    .brand { display: grid; justify-items: center; gap: 8px; text-decoration: none; font-size: 20px; font-weight: 700; }
    .doc { width: min(760px, 100%); padding: 28px 24px; color: var(--muted); line-height: 1.6; font-size: 15px; }
    h1 { font-size: 26px; color: var(--text); margin: 0 0 12px; }
    .updated, .sub { margin: 0 0 12px; }
    strong, .body ::ng-deep strong { color: var(--text); }
    .body ::ng-deep h3 { color: var(--text); font-size: 17px; margin: 24px 0 8px; }
    .body ::ng-deep p { margin: 0 0 12px; }
    .body ::ng-deep ul, .body ::ng-deep ol { margin: 0 0 12px; padding-left: 22px; }
    .body ::ng-deep table { border-collapse: collapse; margin: 0 0 12px; display: block; overflow-x: auto; }
    .body ::ng-deep th, .body ::ng-deep td { border: 1px solid var(--line); padding: 6px 12px; text-align: left; }
    .body ::ng-deep th { color: var(--text); }
    .back { font-size: 14px; color: var(--cyan); text-decoration: none; }
    .back:hover { text-decoration: underline; }
  `,
})
export class TermsComponent implements OnInit {
  private api = inject(ApiService);
  terms = signal<Terms | null>(null);
  failed = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      this.terms.set(await this.api.terms());
    } catch {
      this.failed.set(true);
    }
  }

  updated(t: Terms): string {
    const [y, m, d] = t.last_updated.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
