import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import {
  AdminPayment, AmbassadorChanges, AmbassadorDetail, AmbassadorSummary, Ambassador, CommissionRow, CustomerReferral,
  NewAmbassador, ReferralsOverview, ReferredCustomer, AdminPlan, AdminPlanChanges, AdminSubscription, AdminSubscriptionChanges, AdminUser,
  AdminUserChanges, Issue, IssueStatus, Me, MyDevices, NewIssue, MyPayment, MySubscription, Overview, Page, Plan, Release, StaffChanges, StaffMember,
  StaffRole,
  Terms,
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
  terms = () => this.get<Terms>('/terms');
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

  // Help: the customer's issues
  myIssues = () => this.get<Issue[]>('/support/issues');
  myIssue = (id: string) => this.get<Issue>(`/support/issues/${id}`);
  raiseIssue = (body: NewIssue) => firstValueFrom(this.http.post<Issue>(this.url('/support/issues'), body));
  replyToIssue = (id: string, body: string) =>
    firstValueFrom(this.http.post<{ status: IssueStatus; status_label: string }>(this.url(`/support/issues/${id}/messages`), { body }));
  resolveIssue = (id: string) =>
    firstValueFrom(this.http.post<{ status: IssueStatus; status_label: string }>(this.url(`/support/issues/${id}/resolve`), {}));

  // Referral codes and the ambassador's own page
  checkReferralCode = (code: string) => this.get<{ valid: boolean }>('/referrals/check', { code });
  ambassadorSummary = (month?: string) => this.get<AmbassadorSummary>('/ambassador/summary', { month });
  ambassadorCustomers = () => this.get<ReferredCustomer[]>('/ambassador/customers');
  ambassadorReport = (month: string) => this.download('/ambassador/report.xlsx', { month });

  // Referrals in the dashboard
  referrals = (month?: string) => this.get<ReferralsOverview>('/dashboard/referrals', { month });
  referralsReport = (month: string) => this.download('/dashboard/referrals/report.xlsx', { month });
  resendReport = (month: string, ambassador_id?: string) =>
    firstValueFrom(this.http.post<void>(this.url('/dashboard/referrals/resend'), { month, ambassador_id }));
  ambassadors = () => this.get<Ambassador[]>('/dashboard/ambassadors');
  addAmbassador = (body: NewAmbassador) =>
    firstValueFrom(this.http.post<{ invited: boolean; ambassador: Ambassador }>(this.url('/dashboard/ambassadors'), body));
  ambassador = (id: string, month?: string) => this.get<AmbassadorDetail>(`/dashboard/ambassadors/${id}`, { month });
  updateAmbassador = (id: string, body: AmbassadorChanges) =>
    firstValueFrom(this.http.patch<Ambassador>(this.url(`/dashboard/ambassadors/${id}`), body));
  ambassadorCustomersAdmin = (id: string) => this.get<ReferredCustomer[]>(`/dashboard/ambassadors/${id}/customers`);
  ambassadorReportAdmin = (id: string, month: string) =>
    this.download(`/dashboard/ambassadors/${id}/report.xlsx`, { month });
  recordPayout = (id: string, body: { month: string; amount: string; mpesa_reference: string }) =>
    firstValueFrom(this.http.post<{ id: number; owed: string }>(this.url(`/dashboard/ambassadors/${id}/payouts`), body));
  deletePayout = (id: string, payoutId: number) =>
    firstValueFrom(this.http.delete<void>(this.url(`/dashboard/ambassadors/${id}/payouts/${payoutId}`)));
  commission = (month: string, ambassador?: string) =>
    this.get<CommissionRow[]>('/dashboard/commission', { month, ambassador });
  reverseCommission = (id: number, reason: string) =>
    firstValueFrom(this.http.post<void>(this.url(`/dashboard/commission/${id}/reverse`), { reason }));
  setUserReferral = (userId: string, code: string) =>
    firstValueFrom(this.http.put<CustomerReferral | null>(this.url(`/dashboard/users/${userId}/referral`), { code }));

  /** Fetch a file (signed in) and hand it to the browser to save. */
  private async download(path: string, q: Query): Promise<void> {
    const res = await firstValueFrom(
      this.http.get(this.url(path), { params: params(q), responseType: 'blob', observe: 'response' }),
    );
    const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'report.xlsx';
    const href = URL.createObjectURL(res.body!);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

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
  issues = (q: Query) => this.get<Page<Issue>>('/dashboard/issues', q);
  issue = (id: string) => this.get<Issue>(`/dashboard/issues/${id}`);
  answerIssue = (id: string, body: string) =>
    firstValueFrom(this.http.post<{ status: IssueStatus; status_label: string }>(this.url(`/dashboard/issues/${id}/messages`), { body }));
  setIssueStatus = (id: string, status: IssueStatus) =>
    firstValueFrom(this.http.patch<Issue>(this.url(`/dashboard/issues/${id}`), { status }));
  subscriptions = (q: Query) =>
    this.get<Page<AdminSubscription> & { state_counts: Record<string, number> }>('/dashboard/subscriptions', q);
}
