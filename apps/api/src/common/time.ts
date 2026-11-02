/**
 * Semua tanggal operasional lab memakai zona waktu Asia/Jakarta.
 * Tanggal "hari" disimpan sebagai UTC tengah malam yang mewakili tanggal kalender Jakarta,
 * sehingga perbandingan tanggal tidak bergantung pada timezone server.
 */
export const TZ = "Asia/Jakarta";

export const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hour12: false,
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function jakartaParts(input: Date = new Date()) {
  const parts = partsFmt.formatToParts(input);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  const minute = Number(get("minute"));
  const weekday = WEEKDAYS.indexOf(get("weekday"));
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute,
    weekday: weekday < 0 ? 0 : weekday,
    minutes: hour * 60 + minute,
  };
}

/** UTC midnight yang mewakili tanggal kalender Jakarta dari input apa pun. */
export function startOfJakartaDay(input: Date | string = new Date()): Date {
  if (typeof input === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
    if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return new Date(NaN);
  const p = jakartaParts(d);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

export function todayJakarta(): Date {
  return startOfJakartaDay(new Date());
}

export function tomorrowJakarta(): Date {
  return addDays(todayJakarta(), 1);
}

export function dayOfWeekJakarta(d: Date): number {
  return jakartaParts(d).weekday;
}

export function minutesNowJakarta(): number {
  return jakartaParts(new Date()).minutes;
}

export function isSameJakartaDay(a: Date | string, b: Date | string): boolean {
  return startOfJakartaDay(a).getTime() === startOfJakartaDay(b).getTime();
}

/** Rentang [awal, akhir) untuk query tanggal tersimpan. */
export function jakartaDayRange(input: Date | string) {
  const start = startOfJakartaDay(input);
  return { gte: start, lt: addDays(start, 1) };
}

export function formatJakartaDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function parseTimeToMinutes(t: string): number {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
