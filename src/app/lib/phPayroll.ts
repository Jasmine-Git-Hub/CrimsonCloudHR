/**
 * Philippine payroll engine (semi-monthly cutoffs, monthly-paid employees).
 *
 * Statutory bases — update PH_PAYROLL when a new circular / wage order is issued:
 *  - SSS:        RA 11199 contribution schedule effective Jan 2025 (final step):
 *                15% of Monthly Salary Credit (MSC), employee 5% / employer 10%,
 *                MSC ₱5,000–₱35,000; MSC above ₱20,000 goes to the WISP/MPF.
 *                Employer also pays EC: ₱10 (MSC < ₱15,000) or ₱30.
 *  - PhilHealth: 5% premium (2024–2025 rate), income floor ₱10,000, ceiling
 *                ₱100,000, shared 50/50 → employee ₱250–₱2,500 / month.
 *  - Pag-IBIG:   HDMF Circular 460 (Feb 2024): max fund salary ₱10,000;
 *                employee 1% (≤ ₱1,500) or 2%, employer 2% → max ₱200 each.
 *  - BIR:        TRAIN law withholding table effective Jan 1, 2023 (RR 11-2018
 *                Annex E), semi-monthly column. Mandatory contributions are
 *                excluded from taxable compensation. Minimum wage earners are
 *                exempt (RA 10963).
 *  - Labor Code: overtime on an ordinary working day = +25% of hourly rate
 *                (Art. 87). Daily rate uses the 261-day factor (5-day week).
 *
 * Not modelled (timesheets don't record them yet): night differential,
 * rest-day / holiday premiums, de minimis benefits, 13th-month pay.
 * This file has no imports so it can be unit-tested directly with Node.
 */

export const PH_PAYROLL = {
  workDaysPerYear: 261,
  hoursPerDay: 8,
  overtimeRate: 1.25,
  /** NCR non-agriculture daily minimum wage (Wage Order NCR-26, July 2025). */
  minimumDailyWage: 695,
  sss: { minMsc: 5_000, maxMsc: 35_000, regularCap: 20_000, step: 500, eeRate: 0.05, erRate: 0.10 },
  philhealth: { rate: 0.05, floor: 10_000, ceiling: 100_000 },
  pagibig: { maxFundSalary: 10_000, lowIncomeThreshold: 1_500 },
  unpaidLeaveTypes: ['leave without pay', 'lwop', 'unpaid leave'],
} as const;

/** BIR semi-monthly withholding table (2023 onwards): [over, baseTax, rate]. */
const SEMI_MONTHLY_TAX: ReadonlyArray<readonly [number, number, number]> = [
  [333_333, 91_770.70, 0.35],
  [83_333, 16_770.70, 0.30],
  [33_333, 4_270.70, 0.25],
  [16_667, 937.50, 0.20],
  [10_417, 0, 0.15],
];

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------------------
// Government contributions (MONTHLY amounts)
// ---------------------------------------------------------------------------
export function computeSSS(monthlyCompensation: number) {
  const { minMsc, maxMsc, regularCap, step, eeRate, erRate } = PH_PAYROLL.sss;
  // Ranges are centred on each credit: e.g. ₱5,250–₱5,749.99 → MSC ₱5,500.
  const msc = Math.min(maxMsc, Math.max(minMsc, step * Math.floor((monthlyCompensation + step / 2) / step)));
  const regularMsc = Math.min(msc, regularCap);
  const mpfMsc = msc - regularMsc;
  return {
    msc,
    employee: round2(msc * eeRate),
    employeeRegular: round2(regularMsc * eeRate),
    employeeMpf: round2(mpfMsc * eeRate),
    employer: round2(msc * erRate),
    ec: msc < 15_000 ? 10 : 30,
  };
}

export function computePhilHealth(monthlyBasic: number) {
  const { rate, floor, ceiling } = PH_PAYROLL.philhealth;
  const base = Math.min(ceiling, Math.max(floor, monthlyBasic));
  const premium = round2(base * rate);
  return { premium, employee: round2(premium / 2), employer: round2(premium / 2) };
}

export function computePagIbig(monthlyCompensation: number) {
  const { maxFundSalary, lowIncomeThreshold } = PH_PAYROLL.pagibig;
  const base = Math.min(monthlyCompensation, maxFundSalary);
  const eeRate = monthlyCompensation <= lowIncomeThreshold ? 0.01 : 0.02;
  return { employee: round2(base * eeRate), employer: round2(base * 0.02) };
}

export function withholdingTaxSemiMonthly(taxableCompensation: number) {
  for (const [over, base, rate] of SEMI_MONTHLY_TAX) {
    if (taxableCompensation > over) return round2(base + (taxableCompensation - over) * rate);
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Calendar helpers (dates are 'YYYY-MM-DD' strings, compared in UTC)
// ---------------------------------------------------------------------------
const toUTC = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const DAY = 86_400_000;

export function weekdaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  for (let t = toUTC(start); t <= toUTC(end); t += DAY) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

// ---------------------------------------------------------------------------
// Full cutoff computation
// ---------------------------------------------------------------------------
export interface CutoffTimesheet { date: string; hoursWorked?: number; overtime?: number; status?: string }
export interface CutoffLeave { start_date: string; end_date: string; leave_type?: string; status?: string }

export interface CutoffInput {
  monthlyBasic: number;
  periodStart: string;
  periodEnd: string;
  /** Only APPROVED timesheets are paid. */
  timesheets: CutoffTimesheet[];
  /** Only APPROVED leaves count; unpaid leave types are treated as absences. */
  leaves: CutoffLeave[];
  /** Approved reimbursements (non-taxable). */
  reimbursements?: number;
}

export function computeCutoff(input: CutoffInput) {
  const { monthlyBasic, periodStart, periodEnd } = input;
  const { workDaysPerYear, hoursPerDay, overtimeRate, minimumDailyWage, unpaidLeaveTypes } = PH_PAYROLL;

  const dailyRate = (monthlyBasic * 12) / workDaysPerYear;
  const hourlyRate = dailyRate / hoursPerDay;
  const semiMonthlyBasic = monthlyBasic / 2;
  const workingDays = weekdaysBetween(periodStart, periodEnd);
  const inPeriod = (d: string) => d >= periodStart && d <= periodEnd;

  // --- attendance: credit per working day, capped at 8h/day ---
  const hoursByDay = new Map<string, number>();
  let overtimeHours = 0;
  for (const ts of input.timesheets) {
    if (ts.status !== 'Approved' || !inPeriod(ts.date)) continue;
    hoursByDay.set(ts.date, Math.min(hoursPerDay, (hoursByDay.get(ts.date) ?? 0) + Number(ts.hoursWorked || 0)));
    overtimeHours += Number(ts.overtime || 0);
  }

  const paidLeaveDays = new Set<string>();
  for (const lv of input.leaves) {
    if (lv.status !== 'Approved') continue;
    if (unpaidLeaveTypes.includes(String(lv.leave_type || '').toLowerCase() as never)) continue;
    for (const d of weekdaysBetween(lv.start_date, lv.end_date)) if (inPeriod(d)) paidLeaveDays.add(d);
  }

  let absentHours = 0;
  for (const d of workingDays) {
    const credited = paidLeaveDays.has(d) ? hoursPerDay : (hoursByDay.get(d) ?? 0);
    absentHours += hoursPerDay - credited;
  }

  // --- earnings ---
  const absences = round2(Math.min(semiMonthlyBasic, absentHours * hourlyRate));
  const overtimePay = round2(overtimeHours * hourlyRate * overtimeRate);
  const allowances = round2(input.reimbursements ?? 0);
  const basicPay = round2(semiMonthlyBasic);
  const grossPay = round2(basicPay + overtimePay + allowances);

  // --- contributions: monthly amount, half deducted each cutoff ---
  const sssM = computeSSS(monthlyBasic);
  const phM = computePhilHealth(monthlyBasic);
  const hdmfM = computePagIbig(monthlyBasic);
  const sss = round2(sssM.employee / 2);
  const philhealth = round2(phM.employee / 2);
  const pagibig = round2(hdmfM.employee / 2);
  const contributions = round2(sss + philhealth + pagibig);

  // --- withholding tax ---
  const minimumWageEarner = dailyRate <= minimumDailyWage;
  const taxableIncome = round2(Math.max(0, basicPay - absences + overtimePay - contributions));
  const tax = minimumWageEarner ? 0 : withholdingTaxSemiMonthly(taxableIncome);

  const totalDeductions = round2(absences + contributions + tax);
  const netPay = round2(grossPay - totalDeductions);

  return {
    earnings: { basicPay, overtimePay, allowances, grossPay },
    deductions: { absences, sss, philhealth, pagibig, tax, total: totalDeductions },
    netPay,
    taxableIncome,
    employerShare: {
      sss: round2(sssM.employer / 2),
      ec: round2(sssM.ec / 2),
      philhealth: round2(phM.employer / 2),
      pagibig: round2(hdmfM.employer / 2),
    },
    breakdown: {
      sssMsc: sssM.msc,
      sssRegular: round2(sssM.employeeRegular / 2),
      sssMpf: round2(sssM.employeeMpf / 2),
      dailyRate: round2(dailyRate),
      hourlyRate: round2(hourlyRate),
      workingDays: workingDays.length,
      paidLeaveDays: paidLeaveDays.size,
      absentHours: round2(absentHours),
      overtimeHours: round2(overtimeHours),
      minimumWageEarner,
    },
  };
}

export type CutoffResult = ReturnType<typeof computeCutoff>;
