import type { TimeFormat } from "../types/settings";

export function parseTimeToMinutes(value: string): number | null {
  const clean = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!clean) return null;

  const ampm = clean.match(/^(\d{1,2})(?::|\.|)?(\d{2})?\s?(am|pm)$/);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = Number(ampm[2] ?? 0);
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    if (ampm[3] === "pm" && hours !== 12) hours += 12;
    if (ampm[3] === "am" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const normalized = clean.replace(".", ":");
  const compact = normalized.match(/^(\d{1,2})(\d{2})$/);
  const parts = compact ? [compact[1], compact[2]] : normalized.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? 0);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const dayMinutes = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(dayMinutes / 60);
  const mins = dayMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function normalizeTimeInput(value: string): string {
  const minutes = parseTimeToMinutes(value);
  return minutes === null ? value.trim().replace(".", ":") : minutesToTime(minutes);
}

export function formatTime(value: string, format: TimeFormat): string {
  const minutes = parseTimeToMinutes(value);
  if (minutes === null) return value;
  const normalized = minutesToTime(minutes);
  if (format === "24h") return normalized;

  const [hourText, minuteText] = normalized.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteText} ${suffix}`;
}

export function subtractOneHour(value: string): string {
  const minutes = parseTimeToMinutes(value);
  return minutes === null ? "" : minutesToTime(minutes - 60);
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0 && m === 0) return "NA";
  if (m === 0) return `${h} hrs`;
  if (h === 0) return `${m} mins`;
  return `${h} hrs ${m} mins`;
}

export function dateTimeToMillis(date: string, time: string): number | null {
  const minutes = parseTimeToMinutes(time);
  if (!date || minutes === null) return null;
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 0, minutes, 0, 0).getTime();
}
