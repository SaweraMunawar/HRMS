// Dates DB mein UTC midnight pe hain, is liye UTC mein format karte hain (warna din khisak jata hai)
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatShortDate = (d: Date) => shortFmt.format(d);
export const formatWeekday = (d: Date) => weekdayFmt.format(d);

/** "12 Sep" ya "12 Sep – 15 Sep" */
export function formatDateRange(start: Date, end: Date): string {
  return start.getTime() === end.getTime() ? formatShortDate(start) : `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

export function pluralDays(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
}
