const nairobi = 'Africa/Nairobi';

export function money(amount: string | number | null | undefined, currency = 'KES'): string {
  const n = Number(amount ?? 0);
  const whole = Number.isInteger(n);
  return `${currency} ${n.toLocaleString('en-KE', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function day(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: nairobi });
}

export function dayTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: nairobi,
  });
}

/** "+12%" against the previous window, or null when there's nothing to compare. */
export function change(now: number, before: number): string | null {
  if (!before) return now ? 'new' : null;
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

export function phone(p: string | null | undefined): string {
  if (!p) return '—';
  const d = p.replace(/\D/g, '');
  return d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : p;
}

/** "just now", "5 minutes ago", "3 hours ago", "2 days ago", then the date. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return '—';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  return day(iso);
}

/** "2027-01" for the month a date falls in, in Nairobi time. */
export function monthKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: nairobi }).formatToParts(date);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}

/** The month before "2027-01": "2026-12". */
export function previousMonthKey(key = monthKey()): string {
  const [y, m] = key.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** "2027-01" -> "January 2027"; short: "Jan". */
export function monthName(key: string, short = false): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 15));
  return short
    ? d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })
    : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
