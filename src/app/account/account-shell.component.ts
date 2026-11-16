import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'bp-account-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="top">
      <a class="brand" routerLink="/" aria-label="Blendy Play home">
        <img src="brand/mark-192.png" alt="" width="32" height="32">
        <span class="neon-text">Blendy Play</span>
      </a>
      <div class="who">
        @if (auth.isAdmin()) {
          <a class="btn ghost small" routerLink="/dashboard">Dashboard</a>
        }
        <button class="btn ghost small" type="button" (click)="auth.signOut('/')">Sign out</button>
      </div>
    </header>
    <main class="body">
      <h1>{{ auth.me()?.first_name ? 'Hi, ' + auth.me()!.first_name + '.' : 'Your account' }}</h1>
      <p class="email">{{ auth.me()?.email }}</p>
      <nav class="tabs" aria-label="Account">
        <a routerLink="/account" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">My account</a>
        <a routerLink="/account/payments" routerLinkActive="on">Payments</a>
        <a routerLink="/account/devices" routerLinkActive="on">Devices</a>
        <a routerLink="/account/security" routerLinkActive="on">Password and security</a>
      </nav>
      <router-outlet />
    </main>
  `,
  styles: `
    .top, .body { width: min(100% - 32px, 860px); margin-inline: auto; }
    .top { display: flex; justify-content: space-between; align-items: center; padding: 18px 0; }
    .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 700; font-size: 18px; }
    .who { display: flex; gap: 10px; }
    .body { padding: 28px 0 64px; }
    h1 { font-size: clamp(28px, 5vw, 40px); letter-spacing: -0.02em; }
    .email { color: var(--muted); margin-top: 4px; }
    .tabs { display: flex; gap: 6px; margin: 28px 0 24px; border-bottom: 1px solid var(--line); overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
    .tabs a {
      padding: 10px 14px; color: var(--muted); text-decoration: none; white-space: nowrap; font-size: 15px;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
    }
    .tabs a:hover { color: var(--text); }
    .tabs a.on { color: var(--text); border-image: var(--neon) 1; border-bottom: 2px solid; }
  `,
})
export class AccountShellComponent {
  auth = inject(AuthService);
}
