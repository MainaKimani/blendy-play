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
