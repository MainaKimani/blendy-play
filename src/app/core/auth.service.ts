import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import { Me } from './models';

const ACCESS = 'blendy.access';
const REFRESH = 'blendy.refresh';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the session lasts until reload.
  }
}

/**
 * The signed-in account. Uses the same backend login as the apps: a JWT pair
 * kept in localStorage, refreshed by the interceptor when the access token
 * expires. `me().is_admin` decides whether the dashboard is offered.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);
  private router = inject(Router);

  readonly me = signal<Me | null>(null);
  readonly isAdmin = computed(() => !!this.me()?.is_admin);
  private access = read(ACCESS);
  private refresh = read(REFRESH);
  private refreshing: Promise<boolean> | null = null;
  private loaded: Promise<Me | null> | null = null;

  get accessToken(): string | null {
    return this.access;
  }

  get signedIn(): boolean {
    return !!this.access || !!this.refresh;
  }

  /** Who is signed in, fetched once per page load. */
  ensureMe(): Promise<Me | null> {
    if (!this.signedIn) return Promise.resolve(null);
    if (!this.loaded) {
      this.loaded = firstValueFrom(this.http.get<Me>(`${this.config.apiBase}/auth/me`))
        .then((me) => {
          this.me.set(me);
          return me;
        })
        .catch(() => {
          this.loaded = null;
          return null;
        });
    }
    return this.loaded;
  }

  async signIn(email: string, password: string): Promise<Me> {
    const tokens = await firstValueFrom(
      this.http.post<{ access: string; refresh: string }>(`${this.config.apiBase}/auth/login`, {
        email,
        password,
      }),
    );
    this.setTokens(tokens.access, tokens.refresh);
    this.loaded = null;
    const me = await this.ensureMe();
    if (!me) throw new Error('Signed in, but the account could not be loaded.');
    return me;
  }

  /** Swap the refresh token for a new access token. Shared by parallel callers. */
  refreshAccess(): Promise<boolean> {
    if (!this.refresh) return Promise.resolve(false);
    if (!this.refreshing) {
      this.refreshing = firstValueFrom(
        this.http.post<{ access: string; refresh?: string }>(`${this.config.apiBase}/auth/refresh`, {
          refresh: this.refresh,
        }),
      )
        .then((t) => {
          this.setTokens(t.access, t.refresh ?? this.refresh);
          return true;
        })
        .catch(() => false)
        .finally(() => (this.refreshing = null));
    }
    return this.refreshing;
  }

  signOut(to = '/signin'): void {
    this.setTokens(null, null);
    this.me.set(null);
    this.loaded = null;
    this.router.navigateByUrl(to);
  }

  /** Replace the signed-in account, e.g. after verifying or editing it. */
  setMe(me: Me): void {
    this.me.set(me);
    this.loaded = Promise.resolve(me);
  }

  /** Forget the session without navigating (after deleting the account). */
  clear(): void {
    this.setTokens(null, null);
    this.me.set(null);
    this.loaded = null;
  }

  private setTokens(access: string | null, refresh: string | null): void {
    this.access = access;
    this.refresh = refresh;
    write(ACCESS, access);
    write(REFRESH, refresh);
  }
}
