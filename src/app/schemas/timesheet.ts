import { z } from 'zod';

// Same patterns firestore.rules enforces server-side — keep them in sync.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SHIFT_MINUTES = 16 * 60;
const CLOCK_SKEW_MINUTES = 5;

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Philippine (Asia/Manila) date & time, regardless of the device's timezone.
 * firestore.rules checks time-ins against the same Manila clock (±5 min).
 * (toISOString() would give the UTC date — wrong before 8 AM in PH.)
 */
const manilaParts = (d: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((p) => [p.type, p.value]),
  );
export const manilaDate = (d: Date = new Date()) => {
  const p = manilaParts(d);
  return `${p.year}-${p.month}-${p.day}`;
};
export const manilaTime = (d: Date = new Date()) => {
  const p = manilaParts(d);
  return `${p.hour}:${p.minute}`;
};

/**
 * Paid hours for a same-day shift. 1 hour unpaid break once the span reaches
 * 9 hours; first 8 hours regular, the rest overtime. firestore.rules
 * recomputes this from timeIn/timeOut, so a client can't inflate it.
 */
export function computeHours(timeIn: string, timeOut: string) {
  if (!HHMM.test(timeIn) || !HHMM.test(timeOut)) return { regular: 0, overtime: 0 };
  const span = (toMinutes(timeOut) - toMinutes(timeIn)) / 60;
  if (span <= 0) return { regular: 0, overtime: 0 };
  const worked = span >= 9 ? span - 1 : span;
  return {
    regular: Number(Math.min(worked, 8).toFixed(2)),
    overtime: Number(Math.max(worked - 8, 0).toFixed(2)),
  };
}

export const timeInSchema = z
  .object({
    employeeId: z.string().trim().min(1).refine((v) => v !== 'TBA', 'You have no Employee ID yet. Please contact HR.'),
    date: z.string().regex(YMD, 'Invalid date.'),
    timeIn: z.string({ required_error: 'Capture your Time In first.' }).regex(HHMM, 'Time In must be in HH:MM format.'),
  })
  .refine((v) => v.date === manilaDate(), { message: 'You can only log attendance for today.', path: ['date'] })
  .refine((v) => toMinutes(v.timeIn) <= toMinutes(manilaTime()) + CLOCK_SKEW_MINUTES, {
    message: 'Time In cannot be in the future.',
    path: ['timeIn'],
  });

export const timeOutSchema = z
  .object({
    timeIn: z.string().regex(HHMM),
    timeOut: z.string({ required_error: 'Capture your Time Out first.' }).regex(HHMM, 'Time Out must be in HH:MM format.'),
  })
  .refine((v) => toMinutes(v.timeOut) > toMinutes(v.timeIn), {
    message: 'Time Out must be later than Time In.',
    path: ['timeOut'],
  })
  .refine((v) => toMinutes(v.timeOut) - toMinutes(v.timeIn) <= MAX_SHIFT_MINUTES, {
    message: 'A single shift cannot exceed 16 hours. Please file a time adjustment request.',
    path: ['timeOut'],
  });

export type TimeInInput = z.infer<typeof timeInSchema>;
export type TimeOutInput = z.infer<typeof timeOutSchema>;

/** First human-readable message from a failed safeParse. */
export const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? 'Invalid input.';
