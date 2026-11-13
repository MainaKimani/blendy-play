import { PaymentStatus, SubState } from '../core/models';

/** Pill tone and the words shown for each payment status. */
export function paymentPill(s: PaymentStatus): { tone: string; text: string } {
  switch (s) {
    case 'SUCCEEDED': return { tone: 'ok', text: 'Paid' };
    case 'PENDING':
    case 'INITIATED': return { tone: 'warn', text: 'Waiting' };
    case 'CANCELLED': return { tone: 'bad', text: 'Cancelled' };
    default: return { tone: 'bad', text: 'Failed' };
  }
}

export function subscriptionPill(s: SubState): { tone: string; text: string } {
  switch (s) {
    case 'ACTIVE': return { tone: 'ok', text: 'Active' };
    case 'EXPIRED': return { tone: 'warn', text: 'Expired' };
    case 'CANCELLED': return { tone: 'bad', text: 'Cancelled' };
    case 'PENDING': return { tone: 'quiet', text: 'Pending' };
    default: return { tone: 'quiet', text: 'No plan' };
  }
}
