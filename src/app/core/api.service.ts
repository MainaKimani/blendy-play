import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import {
  AdminPayment, AdminPlan, AdminPlanChanges, AdminSubscription, AdminSubscriptionChanges, AdminUser,
  AdminUserChanges, Me, MyDevices, MyPayment, MySubscription, Overview, Page, Plan, Release, StaffChanges, StaffMember,
  StaffRole,
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

  // Forgot password (no sign-in needed)
  requestReset = (email: string) =>
    firstValueFrom(this.http.post<{ detail: string }>(this.url('/auth/password-reset'), { email }));
  checkReset = (token: string) =>
    firstValueFrom(this.http.post<{ email: string }>(this.url('/auth/password-reset/check'), { token }));
  confirmReset = (token: string, new_password: string) =>
    firstValueFrom(
      this.http.post<{ detail: string }>(this.url('/auth/password-reset/confirm'), { token, new_password }),
    );

  // Email verification after registering
  verifyEmail = (code: string) => firstValueFrom(this.http.post<Me>(this.url('/auth/verify-email'), { code }));
  resendCode = () =>
    firstValueFrom(this.http.post<{ detail: string; retry_after: number }>(this.url('/auth/verify-email/resend'), {}));

  // The signed-in customer
  mySubscription = () => this.get<MySubscription>('/me/subscription');
  myPayments = (page = 1) => this.get<Page<MyPayment>>('/payments/mine', { page });
  updateMe = (body: Partial<Pick<Me, 'first_name' | 'last_name' | 'phone_number'>>) =>
    firstValueFrom(this.http.patch<Me>(this.url('/auth/me'), body));
  changePassword = (current_password: string, new_password: string) =>
    firstValueFrom(this.http.post<void>(this.url('/auth/me/password'), { current_password, new_password }));
  deleteAccount = (password: string) =>
    firstValueFrom(this.http.request<void>('DELETE', this.url('/auth/me'), { body: { password } }));
  myDevices = () => this.get<MyDevices>('/auth/me/devices');
  signOutDevice = (id: string) => firstValueFrom(this.http.delete<void>(this.url(`/auth/me/devices/${id}`)));

  // The admin dashboard
  overview = (days: number) => this.get<Overview>('/dashboard/overview', { days });
  users = (q: Query) => this.get<Page<AdminUser>>('/dashboard/users', q);
  user = (id: string) => this.get<AdminUser>(`/dashboard/users/${id}`);
  updateUser = (id: string, body: AdminUserChanges) =>
    firstValueFrom(this.http.patch<AdminUser>(this.url(`/dashboard/users/${id}`), body));
  updateSubscription = (id: string, body: AdminSubscriptionChanges) =>
    firstValueFrom(this.http.patch<AdminUser>(this.url(`/dashboard/users/${id}/subscription`), body));
  signOutUserDevice = (id: string, deviceId: string) =>
    firstValueFrom(this.http.delete<AdminUser>(this.url(`/dashboard/users/${id}/devices/${deviceId}`)));
  staff = () => this.get<StaffMember[]>('/dashboard/staff');
  addStaff = (body: { email: string; first_name: string; last_name: string; role: StaffRole }) =>
    firstValueFrom(this.http.post<{ invited: boolean; staff: StaffMember[] }>(this.url('/dashboard/staff'), body));
  updateStaff = (id: string, body: StaffChanges) =>
    firstValueFrom(this.http.patch<StaffMember[]>(this.url(`/dashboard/staff/${id}`), body));
  removeStaff = (id: string) => firstValueFrom(this.http.delete<StaffMember[]>(this.url(`/dashboard/staff/${id}`)));
  adminPlans = () => this.get<AdminPlan[]>('/dashboard/plans');
  createPlan = (body: AdminPlanChanges) => firstValueFrom(this.http.post<AdminPlan>(this.url('/dashboard/plans'), body));
  updatePlan = (id: string, body: AdminPlanChanges) =>
    firstValueFrom(this.http.patch<AdminPlan>(this.url(`/dashboard/plans/${id}`), body));
  deletePlan = (id: string) => firstValueFrom(this.http.delete<void>(this.url(`/dashboard/plans/${id}`)));
  payments = (q: Query) => this.get<Page<AdminPayment>>('/dashboard/payments', q);
  subscriptions = (q: Query) =>
    this.get<Page<AdminSubscription> & { state_counts: Record<string, number> }>('/dashboard/subscriptions', q);
}
