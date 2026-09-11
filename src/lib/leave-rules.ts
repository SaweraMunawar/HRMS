// =====================================================================
//  Leave rules - seed aur app DONO yahi functions use karenge
//  taake "kitne din" aur "escalate hoga ya nahi" ka hisaab ek jaisa ho.
// =====================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date ka sirf din rakho (UTC midnight). DB mein saari dates isi form mein hain. */
export function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** Saturday / Sunday */
export function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function sameDay(a: Date, b: Date): boolean {
  return toDateOnly(a).getTime() === toDateOnly(b).getTime();
}

/**
 * Leave ke asal din: start se end tak, weekends aur subsidiary ki
 * holidays nikaal ke. (Requirement 3.6)
 */
export function countLeaveDays(start: Date, end: Date, holidays: Date[]): number {
  const holidaySet = new Set(holidays.map((h) => toDateOnly(h).getTime()));
  let count = 0;
  for (let d = toDateOnly(start); d <= toDateOnly(end); d = addDays(d, 1)) {
    if (!isWeekend(d) && !holidaySet.has(d.getTime())) count++;
  }
  return count;
}

/**
 * Kya request Department Head (Level 2) tak jayegi? (Requirement 3.5)
 * - leave type hamesha escalate hota ho, YA
 * - din threshold se zyada hon (e.g. 3 se zyada)
 */
export function needsEscalation(
  totalDays: number,
  leaveType: { requiresEscalation: boolean; escalationThresholdDays: number },
): boolean {
  return leaveType.requiresEscalation || totalDays > leaveType.escalationThresholdDays;
}
