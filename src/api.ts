import type { Card, KeyFile, LogEvent, Schedule } from "./types";

const LOG_KEY = "desk-log";

function readCache(): LogEvent[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as LogEvent[]) : [];
  } catch {
    return [];
  }
}

export function readDraft(key: string): string {
  try {
    return localStorage.getItem(`desk-draft:${key}`) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(key: string, value: string): void {
  try {
    localStorage.setItem(`desk-draft:${key}`, value);
  } catch {
    /* the writing line still lives in the page */
  }
}

export async function loadSchedule(): Promise<Schedule> {
  const response = await fetch("/content/schedule.json");
  return response.json();
}

export async function loadCards(): Promise<Record<string, Card>> {
  const response = await fetch("/content/cards.json");
  return response.json();
}

export async function loadLabels(lessonId: string): Promise<string[]> {
  const response = await fetch(`/api/lesson-labels/${encodeURIComponent(lessonId)}`);
  if (!response.ok) return [];
  return response.json();
}

export async function checkCells(id: string, answer: string, mid: string): Promise<{ answerOk: boolean; midOk: boolean }> {
  const response = await fetch("/api/check-cells", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, answer, mid }),
  });
  if (!response.ok) throw new Error("check");
  return response.json();
}

export async function checkLesson(lessonId: string, values: string[]): Promise<boolean> {
  const response = await fetch("/api/check-lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId, values }),
  });
  if (!response.ok) return false;
  const body = (await response.json()) as { ok?: boolean };
  return Boolean(body.ok);
}

export async function loadLesson(id: string): Promise<string> {
  const response = await fetch(`/content/lessons/${id}.md`);
  if (!response.ok) return "This lesson is not on disk yet.";
  return response.text();
}

export async function loadLog(): Promise<LogEvent[]> {
  try {
    const response = await fetch("/api/log");
    if (!response.ok) throw new Error("log");
    const events = (await response.json()) as LogEvent[];
    localStorage.setItem(LOG_KEY, JSON.stringify(events));
    return events;
  } catch {
    return readCache();
  }
}

export async function postLog(event: LogEvent): Promise<boolean> {
  try {
    const response = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!response.ok) return false;
    const cached = readCache();
    cached.push({ ...event, t: new Date().toISOString() });
    localStorage.setItem(LOG_KEY, JSON.stringify(cached));
    return true;
  } catch {
    return false;
  }
}

export async function loadKey(id: string, part: "hint3" | "sentence"): Promise<Partial<KeyFile>> {
  const response = await fetch(`/api/key/${encodeURIComponent(id)}?part=${part}`);
  if (!response.ok) throw new Error("missing key");
  return response.json();
}
