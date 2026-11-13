export interface Me {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  has_cinejoy_account: boolean;
  cinejoy_last4: string;
  is_admin: boolean;
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
  started_at: string | null;
  current_period_end: string | null;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone_number: string;
  is_active: boolean;
  has_cinejoy_account: boolean;
  created_at: string;
  subscription: { state: SubState; plan: string | null; current_period_end: string | null };
  payments_count: number | null;
  total_paid: string;
  payments?: AdminPayment[];
}

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

export interface Release {
  version: string;
  date: string;
  files: ReleaseFile[];
}

export interface ReleaseFile {
  platform: 'android' | 'windows' | 'linux';
  label: string;
  file: string;
  size?: string;
  requires: string;
  howto: string;
}
