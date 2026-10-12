/**
 * Accurate Local Date & Time Utilities for Publishing Calendar
 * Prevents UTC timezone skew where events cross midnight or land on the wrong calendar day.
 */

/**
 * Returns YYYY-MM-DD formatted strictly in the client's local timezone.
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns HH:mm formatted strictly in the client's local timezone.
 */
export function formatLocalTime(d: Date): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Parses a local date string (YYYY-MM-DD) and local time string (HH:mm)
 * into a valid local Date object.
 */
export function parseLocalDateAndTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setFullYear(year, (month || 1) - 1, day || 1);
  d.setHours(hours || 0, minutes || 0, 0, 0);
  return d;
}

/**
 * Human readable display for dates (e.g. "Wed, Oct 14" or "Today")
 */
export function formatDisplayDate(dateStr: string): string {
  const todayStr = formatLocalDate(new Date());
  if (dateStr === todayStr) return 'Today';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === formatLocalDate(tomorrow)) return 'Tomorrow';

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);
  return dateObj.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Relative time description (e.g. "in 2 hours", "in 3 days", "passed")
 */
export function formatRelativePublishTime(isoOrTimestamp: string | number): string {
  const targetTime = typeof isoOrTimestamp === 'number' ? isoOrTimestamp : new Date(isoOrTimestamp).getTime();
  if (isNaN(targetTime)) return 'Scheduled';

  const diffMs = targetTime - Date.now();
  if (diffMs <= 0) return 'Publishing now / Released';

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `in ${diffMins}m`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `in ${diffHours}h ${diffMins % 60}m`;

  const diffDays = Math.floor(diffHours / 24);
  return `in ${diffDays}d ${diffHours % 24}h`;
}
