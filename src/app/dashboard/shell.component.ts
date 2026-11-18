import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'bp-dashboard-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="layout" [class.open]="menuOpen()">
      <aside class="side">
        <a class="brand" routerLink="/" aria-label="Blendy Play home">
          <img src="brand/mark-192.png" alt="" width="34" height="34">
          <span><span class="neon-text">Blendy Play</span><small>Studio</small></span>
        </a>
        <nav aria-label="Dashboard">
          @for (item of nav(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="on">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
              {{ item.label }}
            </a>
          }
        </nav>
        <div class="me">
          <span class="email">{{ auth.me()?.email }}</span>
          <a routerLink="/account">My account</a>
          <button type="button" (click)="auth.signOut('/admin')">Sign out</button>
        </div>
      </aside>
      <div class="main">
        <header class="mobile-bar">
          <button type="button" class="menu" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()">Menu</button>
          <span class="neon-text">Blendy Studio</span>
        </header>
        <router-outlet />
      </div>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 236px 1fr; min-height: 100dvh; }
    .side {
      position: sticky; top: 0; height: 100dvh; display: flex; flex-direction: column; gap: 28px;
      padding: 22px 14px; border-right: 1px solid var(--line); background: var(--card);
    }
    .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; padding: 0 8px; }
    .brand span { display: grid; font-weight: 700; font-size: 17px; line-height: 1.2; }
    .brand small { color: var(--muted); font-weight: 400; font-size: 13px; }
    nav { display: grid; gap: 4px; }
    nav a {
      display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px;
      color: var(--muted); text-decoration: none; font-size: 15px; position: relative;
    }
    nav a:hover { color: var(--text); background: rgba(255, 255, 255, 0.03); }
    nav a.on { color: var(--text); background: var(--card-2); }
    nav a.on::before {
      content: ""; position: absolute; left: -14px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0;
      background: linear-gradient(180deg, var(--cyan), var(--magenta));
    }
    nav svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .me { margin-top: auto; display: grid; gap: 6px; padding: 14px 10px 0; border-top: 1px solid var(--line); font-size: 14px; }
    .email { color: var(--muted); font-size: 13px; overflow: hidden; text-overflow: ellipsis; }
    .me a, .me button { color: var(--text); background: none; border: 0; padding: 4px 0; text-align: left; font: inherit; cursor: pointer; text-decoration: none; }
    .me a:hover, .me button:hover { color: var(--cyan); }
    .main { min-width: 0; padding: 28px clamp(16px, 3vw, 40px) 56px; }
    .mobile-bar { display: none; }
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: fixed; z-index: 10; inset: 0 auto 0 0; width: 260px; transform: translateX(-100%); transition: transform 0.2s; }
      .open .side { transform: none; box-shadow: 0 0 60px rgba(0, 0, 0, 0.8); }
      .mobile-bar { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; font-weight: 700; }
      .menu { background: var(--card-2); border: 1px solid var(--line); color: var(--text); border-radius: 9px; padding: 8px 12px; font: 14px var(--font); }
    }
  `,
})
export class DashboardShellComponent {
  auth = inject(AuthService);
  menuOpen = signal(false);
  private items = [
    { path: 'overview', label: 'Overview', icon: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z' },
    { path: 'users', label: 'Users', icon: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8' },
    { path: 'issues', label: 'Issues', icon: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.9A8 8 0 1 1 21 12zM8.5 10h7M8.5 14h4' },
    { path: 'payments', label: 'Payments', icon: 'M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM3 10h18M7 15h3' },
    { path: 'plans', label: 'Plans', icon: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01' },
    { path: 'referrals', label: 'Referrals', icon: 'M16 11a4 4 0 1 0-8 0M12 15c-4 0-7 2-7 4.5V21h14v-1.5c0-2.5-3-4.5-7-4.5zM19 4l2 2-2 2M21 6h-5' },
    { path: 'subscriptions', label: 'Subscriptions', icon: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4' },
  ];
  private staffItem = {
    path: 'staff', label: 'Staff', icon: 'M12 3 4 6v6c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V6zM9 12l2 2 4-4',
  };
  /** Only a super-admin manages staff. */
  nav = computed(() => (this.auth.isSuperAdmin() ? [...this.items, this.staffItem] : this.items));

  constructor() {
    inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.menuOpen.set(false));
  }
}
