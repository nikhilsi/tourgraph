// Shared formatting utilities

export function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(price % 1 === 0 ? 0 : 2)}`;
  return `$${price.toFixed(2)}`;
}

export function formatDurationShort(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) {
    if (hours === 0) return days === 1 ? `1 day` : `${days} days`;
    return `${days}d ${hours}h`;
  }
  if (mins > 0) return `${hours} hr ${mins} min`;
  return hours === 1 ? `1 hr` : `${hours} hrs`;
}

export function formatDurationLong(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) {
    const parts = [days === 1 ? "1 day" : `${days} days`];
    if (hours > 0) parts.push(hours === 1 ? "1 hour" : `${hours} hours`);
    return parts.join(", ");
  }
  return mins > 0 ? `${hours}h ${mins}m` : hours === 1 ? "1 hour" : `${hours} hours`;
}

export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
