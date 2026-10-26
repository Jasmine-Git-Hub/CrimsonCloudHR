// Yearly leave credits. firestore.rules has the same numbers in leaveLimit():
// keep them in sync.
//
// Credits are counted in WORKING days (Mon–Fri) per calendar year and reset
// every January 1. A request can't cross a year boundary — file two.
// Approved days are tracked in leaveBalances/{employeeId}_{year}.used, which
// HR updates in the same write as the approval (the rules enforce it).

export const LEAVE_LIMITS: Record<string, number> = {
  "Vacation Leave": 15,
  "Sick Leave": 15,
  "Emergency Leave": 3,
  "Bereavement Leave": 3,
  "Paternity Leave": 7,     // RA 8187
  "Study Leave": 30,
  "Maternity Leave": 105,   // RA 11210 (counted here in working days)
};

export const LEAVE_TYPES = Object.keys(LEAVE_LIMITS);

const DAY = 86_400_000;
const toUTC = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

/** Mon–Fri between two YYYY-MM-DD dates, inclusive. */
export function countWeekdays(start: string, end: string) {
  if (!start || !end || end < start) return 0;
  let n = 0;
  for (let t = toUTC(start); t <= toUTC(end); t += DAY) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

export const leaveYear = (date: string) => Number(date.slice(0, 4));
export const balanceId = (employeeId: string, year: number) => `${employeeId}_${year}`;

export interface LeaveLike { leave_type: string; start_date: string; total_days: number; status: string }
export type UsedByType = Record<string, number>;

/** Remaining credits for one type, counting approved (from the balance doc) and pending days. */
export function remaining(type: string, used: UsedByType, pendingDays = 0) {
  return (LEAVE_LIMITS[type] ?? 0) - (used[type] ?? 0) - pendingDays;
}

export function pendingDaysFor(requests: LeaveLike[], type: string, year: number, excludeId?: string) {
  return requests
    .filter((r) => r.status === "Pending" && r.leave_type === type && leaveYear(r.start_date) === year && (r as any).id !== excludeId)
    .reduce((sum, r) => sum + (r.total_days || 0), 0);
}

/** Approved working days per type per employee-year, for rebuilding leaveBalances. */
export function tallyApproved(requests: (LeaveLike & { employee_id: string })[]) {
  const out: Record<string, { employeeId: string; year: number; used: UsedByType }> = {};
  for (const r of requests) {
    if (r.status !== "Approved" || !r.employee_id || !r.start_date) continue;
    const year = leaveYear(r.start_date);
    const id = balanceId(r.employee_id, year);
    out[id] ??= { employeeId: r.employee_id, year, used: {} };
    out[id].used[r.leave_type] = (out[id].used[r.leave_type] ?? 0) + (r.total_days || 0);
  }
  return out;
}

/** Why a new request can't be filed, or null if it's fine. */
export function validateLeave(
  form: { leave_type: string; start_date: string; end_date: string },
  used: UsedByType,
  pendingDays: number,
) {
  if (!form.start_date || !form.end_date) return "Please choose start and end dates.";
  if (form.end_date < form.start_date) return "End date must be on or after the start date.";
  if (form.start_date.slice(0, 4) !== form.end_date.slice(0, 4)) return "A leave can't cross into the next year. Please file two requests.";
  if (!(form.leave_type in LEAVE_LIMITS)) return "Unknown leave type.";
  const days = countWeekdays(form.start_date, form.end_date);
  if (days === 0) return "The selected dates are all weekends.";
  const left = remaining(form.leave_type, used, pendingDays);
  if (days > left) {
    return `Not enough ${form.leave_type} credits: ${days} working day(s) requested, ${Math.max(left, 0)} left for ${form.start_date.slice(0, 4)}` +
      (pendingDays ? ` (${pendingDays} day(s) already pending).` : ".");
  }
  return null;
}
