import { Session, Break } from '../db/schema';

export function calculateProfit(session: Session): number {
  return session.cash_out - session.buy_in;
}

export function calculateDuration(session: Session, breaks: Break[]): number {
  const totalMs = session.end - session.start;
  const breakMs = breaks.reduce((sum, b) => sum + (b.end - b.start), 0);
  return totalMs - breakMs;
}

export function calculateHours(durationMs: number): number {
  return durationMs / (1000 * 60 * 60);
}

export function calculateHourlyRate(profit: number, hours: number): number {
  if (hours === 0) return 0;
  return profit / hours;
}

export function formatCurrency(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  if (amount < 0) {
    return `(${formatted})`;
  }
  return formatted;
}

export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function formatBlinds(sb: number, bb: number, straddle: number): string {
  if (straddle > 0) {
    return `$${sb}/$${bb}/$${straddle}`;
  }
  return `$${sb}/$${bb}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function getDayOfWeek(timestamp: number): number {
  return new Date(timestamp).getDay(); // 0 = Sunday, 6 = Saturday
}

export function getDayName(day: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day];
}
