// ============================================================
// Timezone Helpers — "Right Now Somewhere" feature
// Uses Intl.DateTimeFormat (no external dependencies).
// ============================================================

// Golden windows: times of day when light is most beautiful
const GOLDEN_MORNING_START = 6;
const GOLDEN_MORNING_END = 8;
const GOLDEN_EVENING_START = 16;
const GOLDEN_EVENING_END = 18;

// Pleasant daytime fallback when golden windows have too few matches
const PLEASANT_START = 9;
const PLEASANT_END = 15;

export function getCurrentHour(tz: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  } catch {
    return -1; // Unrecognized timezone
  }
}

export function formatLocalTime(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return formatter.format(new Date());
  } catch {
    return "";
  }
}

export function getTimeOfDayLabel(hour: number): string {
  if (hour >= GOLDEN_MORNING_START && hour <= GOLDEN_MORNING_END) return "sunrise";
  if (hour >= GOLDEN_EVENING_START && hour <= GOLDEN_EVENING_END) return "golden hour";
  if (hour >= 9 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 15) return "afternoon";
  if (hour >= 19 && hour <= 21) return "evening";
  return "night";
}

// Returns IANA timezone strings where it's currently golden hour (6-8 or 16-18)
export function getGoldenTimezones(allTimezones: string[]): string[] {
  return allTimezones.filter((tz) => {
    const hour = getCurrentHour(tz);
    if (hour < 0) return false;
    return (
      (hour >= GOLDEN_MORNING_START && hour <= GOLDEN_MORNING_END) ||
      (hour >= GOLDEN_EVENING_START && hour <= GOLDEN_EVENING_END)
    );
  });
}

// Fallback: returns timezones where it's pleasant daytime (9-15)
export function getPleasantTimezones(allTimezones: string[]): string[] {
  return allTimezones.filter((tz) => {
    const hour = getCurrentHour(tz);
    if (hour < 0) return false;
    return hour >= PLEASANT_START && hour <= PLEASANT_END;
  });
}
