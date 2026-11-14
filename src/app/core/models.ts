export interface Me {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  has_cinejoy_account: boolean;
  cinejoy_last4: string;
  is_admin: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface Plan {
  code: string;
  name: string;
  interval: 'WEEK' | 'MONTH';
  currency: string;
  price: string;
  duration_days?: number;
}

export interface MySubscription {
  active: boolean;
  status: 'NONE' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  plan: { name: string; currency: string; price: string } | null;
  current_period_end: string | null;
}

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MyPayment {
  id: string;
  plan: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  mpesa_receipt: string;
  created_at: string;
  paid_at: string | null;
}

export type PaymentStatus = 'INITIATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type SubStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type SubState = 'NONE' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface AdminPayment {
  id: string;
  user: { id: string; email: string };
  plan: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  phone_number: string;
  mpesa_receipt: string;
  failure_reason: string;
  terms_version: string;
  reconciliation_status: string;
  created_at: string;
  paid_at: string | null;
}

export interface AdminSubscription {
  id: string;
  user: { id: string; email: string };
  plan: string | null;
  status: string;
  state: SubState;
  lifetime: boolean;
  started_at: string | null;
  current_period_end: string | null;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_active: boolean;
  email_verified: boolean;
  /** Deleted by its owner: anonymised and not editable. */
  is_deleted: boolean;
  has_cinejoy_account: boolean;
  created_at: string;
  subscription: {
    state: SubState;
    status: SubStatus | null;
    plan: string | null;
    plan_code: string | null;
    started_at: string | null;
    /** Admin-granted, no end date (current_period_end is null). */
    lifetime: boolean;
    current_period_end: string | null;
  };
  payments_count: number | null;
  total_paid: string;
  payments?: AdminPayment[];
}

export type AdminUserChanges = Partial<
  Pick<AdminUser, 'first_name' | 'last_name' | 'email' | 'phone_number' | 'is_active' | 'email_verified'>
>;

export interface AdminSubscriptionChanges {
  plan?: string | null;
  status?: SubStatus;
  current_period_end?: string | null;
  add_days?: number;
  lifetime?: boolean;
}

export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  price: string;
  currency: string;
  interval: 'WEEK' | 'MONTH';
  duration_days: number;
  /** Shown on the paywall. Hidden plans stay for history. */
  is_active: boolean;
  created_at: string;
  active_subscribers: number;
  payments_count: number;
  revenue: string;
}

export type AdminPlanChanges = Partial<Pick<AdminPlan, 'code' | 'name' | 'price' | 'interval' | 'duration_days' | 'is_active'>>;

export interface Overview {
  days: number;
  currency: string;
  totals: {
    users: number;
    new_users: number;
    new_users_previous: number;
    active_subscriptions: number;
    revenue: string;
    revenue_previous: string;
    revenue_all_time: string;
    payments_succeeded: number;
    payments_failed: number;
    payments_pending: number;
    success_rate: number | null;
  };
  series: { date: string; revenue: string; payments: number; signups: number }[];
  plans: { code: string; name: string; price: string; currency: string; active_subscribers: number; revenue: string }[];
  expiring_soon: AdminSubscription[];
  recent_payments: AdminPayment[];
}

/**
 * The signed release manifest, /downloads/releases.json, written by
 * mk-flix/release/publish.mjs. The apps verify its signature before trusting
 * it; the website only uses it to list the downloads.
 */
export interface Release {
  schema: number;
  version: string;
  date: string;
  notes: string[];
  platforms: Partial<Record<'android' | 'windows' | 'linux', ReleaseFile>>;
}

export interface ReleaseFile {
  version: string;
  minimum_version: string | null;
  /** Relative to /downloads/, e.g. "1.5.0/Blendy-Play_1.5.0.apk". */
  file: string;
  size: number;
  sha256: string;
  label: string;
  requires: string;
  howto: string;
}

export type ReleasePlatform = keyof Release['platforms'];
