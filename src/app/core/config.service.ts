import { Injectable } from '@angular/core';

export interface PortalConfig {
  /** The Blendy Play backend, ending in /api. */
  apiBase: string;
  supportEmail: string;
}

/**
 * Settings read at startup from /config.json rather than baked into the build,
 * so one build can be deployed against any backend: replace config.json on the
 * server and reload.
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: PortalConfig = {
    apiBase: 'http://localhost:8000/api',
    supportEmail: 'blendyplay@mainakimani.com',
  };

  async load(): Promise<void> {
    try {
      const res = await fetch('/config.json', { cache: 'no-store' });
      if (res.ok) this.config = { ...this.config, ...(await res.json()) };
    } catch {
      // Keep the defaults; the API calls will show their own errors.
    }
    this.config.apiBase = this.config.apiBase.replace(/\/+$/, '');
  }

  get apiBase(): string {
    return this.config.apiBase;
  }

  get supportEmail(): string {
    return this.config.supportEmail;
  }
}
