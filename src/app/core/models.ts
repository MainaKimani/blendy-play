export interface Me {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  has_cinejoy_account: boolean;
  cinejoy_last4: string;
  /** Staff or super-admin: can open the dashboard. */
  is_admin: boolean;
  /** Super-admin: can change things in the dashboard, staff included. */
  is_superadmin: boolean;
  /** An ambassador: has their own page at /ambassador. */
  is_ambassador: boolean;
  email_verified: boolean;
  /** The "ends soon" and "has ended" emails. Receipts don't depend on it. */
  renewal_reminders: boolean;
  created_at: string;
}

/** DAY is a pass (shown as "24 hours"), not a repeating bill. */
export type PlanInterval = 'DAY' | 'WEEK' | 'MONTH';

export interface Plan {
  code: string;
  name: string;
  interval: PlanInterval;
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
  /** Devices signed in now (on the customer's detail only). */
  devices?: Device[];
  /** The ambassador who referred this customer (on the detail only). */
  referral?: CustomerReferral | null;
  is_ambassador?: boolean;
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
  interval: PlanInterval;
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

/** A signed-in device: an app install, or a browser on this site. */
export interface Device {
  id: string;
  kind: 'app' | 'portal';
  /** android, windows, linux or web. */
  platform: string;
  name: string;
  app_version: string;
  signed_in_at: string;
  last_seen_at: string;
  /** The device making this request. */
  current: boolean;
}

export interface MyDevices {
  /** How many apps may be signed in at once; null for no limit. */
  limit: number | null;
  apps_signed_in: number;
  devices: Device[];
}

export type StaffRole = 'staff' | 'superadmin';

export interface StaffMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  role: StaffRole;
  is_active: boolean;
  /** False until an invited member chooses their password. */
  has_password: boolean;
  last_active_at: string | null;
  created_at: string;
  is_you: boolean;
}

export type StaffChanges = Partial<Pick<StaffMember, 'first_name' | 'last_name' | 'role' | 'is_active'>>;

/** GET /terms: the live Terms and Conditions. `html` is escaped by the backend. */
export interface Terms {
  version: string;
  /** YYYY-MM-DD */
  last_updated: string;
  html: string;
}

export type IssueStatus = 'open' | 'waiting' | 'resolved';
export type IssueCategory = 'playback' | 'payment' | 'account' | 'app' | 'other';

/** An issue raised from Help. The device fields are copied when it's raised. */
export interface Issue {
  id: string;
  title: string;
  category: IssueCategory;
  category_label: string;
  status: IssueStatus;
  /** "Open", "Waiting on you", "Resolved". */
  status_label: string;
  device_name: string;
  platform: string;
  app_version: string;
  created_at: string;
  last_message_at: string;
  /** A reply from the other side that hasn't been opened yet. */
  unread: boolean;
  /** The team's view only. */
  user?: { id: string; email: string; name: string };
  /** On a single issue only. */
  messages?: IssueMessage[];
}

export interface IssueMessage {
  id: string;
  from_staff: boolean;
  /** "You" / "Blendy Play team" for the customer; names for the team. */
  author: string;
  body: string;
  created_at: string;
}

export interface NewIssue {
  title: string;
  category: IssueCategory;
  body: string;
  /** One of the user's apps; null for "not about a device". Left out: their only app. */
  device?: string | null;
}

// --- Referrals: ambassadors earn commission on the customers they bring ---

export interface CustomerReferral {
  code: string;
  ambassador: string;
  ambassador_id: string;
  source: 'signup' | 'admin';
  window_ends_at: string | null;
}

/** One ambassador's numbers for a month. Money is a decimal string in KES. */
export interface AmbassadorFigures {
  month: string;
  new_referrals: number;
  total_referrals: number;
  paying_customers: number;
  active_subscriptions: number;
  payments: number;
  revenue: string;
  commission_earned: string;
  reversals: string;
  paid_out: string;
  /** Owed now: earned, less reversals, less payouts. Negative after a refund that was paid out. */
  owed: string;
}

export interface MonthPoint {
  month: string;
  revenue: string;
  commission: string;
}

export interface AmbassadorSummary {
  code: string;
  is_active: boolean;
  commission_rate: string;
  figures: AmbassadorFigures;
  series: MonthPoint[];
}


export interface ReferredCustomer {
  id: number;
  /** Masked for the ambassador (wan***mau@gmail.com); full for staff. */
  email: string;
  customer_id?: string;
  joined_at: string;
  plan: string | null;
  subscription: SubState;
  period_end: string | null;
  window_ends_at: string | null;
  commission: string;
  source: 'signup' | 'admin';
}

export interface Ambassador {
  id: string;
  code: string;
  name: string;
  email: string;
  first_name: string;
  last_name: string;
  user_id: string;
  /** False until they've used their invitation to choose a password. */
  has_password: boolean;
  commission_rate: string;
  payout_phone: string;
  is_active: boolean;
  notes: string;
  created_at: string;
}

export interface AmbassadorRow extends Ambassador {
  figures: AmbassadorFigures;
}

export interface ReportEmailSent {
  kind: 'ambassador' | 'admin';
  to: string;
  ambassador_id: string | null;
  sent_at: string;
}

export interface ReferralsOverview {
  month: string;
  ambassadors: AmbassadorRow[];
  totals: Partial<Record<keyof AmbassadorFigures, string | number>>;
  emails_sent: ReportEmailSent[];
}

export interface AmbassadorPayout {
  id: number;
  month: string;
  amount: string;
  mpesa_reference: string;
  paid_at: string;
}

export interface AmbassadorDetail extends Ambassador {
  figures: AmbassadorFigures;
  series: MonthPoint[];
  payouts: AmbassadorPayout[];
}

export interface CommissionRow {
  id: number;
  date: string;
  ambassador: string;
  email: string;
  plan: string;
  payment_amount: string;
  rate: string;
  amount: string;
  status: 'earned' | 'reversed';
  reversed_at: string | null;
  /** False for a line earned earlier but reversed in this month. */
  earned_this_month: boolean;
}

export type AmbassadorChanges = Partial<
  Pick<Ambassador, 'first_name' | 'last_name' | 'code' | 'commission_rate' | 'payout_phone' | 'is_active' | 'notes'>
>;

export interface NewAmbassador extends AmbassadorChanges {
  email: string;
  code: string;
}
