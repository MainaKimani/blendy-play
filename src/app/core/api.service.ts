import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import {
  AdminPayment, AdminSubscription, AdminUser, Me, MyPayment, MySubscription, Overview, Page, Plan, Release,
} from './models';

type Query = Record<string, string | number | undefined>;

function params(q: Query = {}): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') p = p.set(k, String(v));
  return p;
}

/** Every backend call the portal makes, in one place. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  private url(path: string): string {
    return `${this.config.apiBase}${path}`;
  }

  private get<T>(path: string, q?: Query): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.url(path), { params: params(q) }));
  }

  // Public
  plans = () => this.get<Plan[]>('/plans');
  releases = () => firstValueFrom(this.http.get<Release>('/downloads/releases.json'));

  // The signed-in customer
  mySubscription = () => this.get<MySubscription>('/me/subscription');
  myPayments = (page = 1) => this.get<Page<MyPayment>>('/payments/mine', { page });
  updateMe = (body: Partial<Pick<Me, 'first_name' | 'last_name' | 'phone_number'>>) =>
    firstValueFrom(this.http.patch<Me>(this.url('/auth/me'), body));
  changePassword = (current_password: string, new_password: string) =>
    firstValueFrom(this.http.post<void>(this.url('/auth/me/password'), { current_password, new_password }));
  deleteAccount = (password: string) =>
    firstValueFrom(this.http.request<void>('DELETE', this.url('/auth/me'), { body: { password } }));

  // The admin dashboard
  overview = (days: number) => this.get<Overview>('/dashboard/overview', { days });
  users = (q: Query) => this.get<Page<AdminUser>>('/dashboard/users', q);
  user = (id: string) => this.get<AdminUser>(`/dashboard/users/${id}`);
  payments = (q: Query) => this.get<Page<AdminPayment>>('/dashboard/payments', q);
  subscriptions = (q: Query) =>
    this.get<Page<AdminSubscription> & { state_counts: Record<string, number> }>('/dashboard/subscriptions', q);
}
