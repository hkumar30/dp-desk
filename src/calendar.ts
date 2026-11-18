const ZONE = "Asia/Kolkata";

export function studyDate(now: Date, zone = ZONE): string {
  const shifted = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

export function weekday(iso: string, zone = ZONE): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: zone }).format(
    new Date(`${iso}T12:00:00+05:30`),
  );
}

export function prevDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function nextDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Consecutive closed study-dates ending at today. The weekly off day does not break the run. */
export function consecutive(closed: string[], today: string, offWeekday = "Sunday"): number {
  const set = new Set(closed);
  let cursor = today;
  let count = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    if (set.has(cursor)) {
      count += 1;
      cursor = prevDate(cursor);
      continue;
    }
    if (weekday(cursor) === offWeekday) {
      cursor = prevDate(cursor);
      continue;
    }
    break;
  }
  return count;
}

export function adherence(closed: string[], today: string, offWeekday = "Sunday"): { closed: number; scheduled: number } {
  if (closed.length === 0) return { closed: 0, scheduled: 0 };
  const set = new Set(closed);
  const start = [...set].sort()[0];
  let scheduled = 0;
  let done = 0;
  for (let cursor = start; cursor <= today; cursor = nextDate(cursor)) {
    if (weekday(cursor) === offWeekday) continue;
    scheduled += 1;
    if (set.has(cursor)) done += 1;
  }
  return { closed: done, scheduled };
}
