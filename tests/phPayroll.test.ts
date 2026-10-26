// Run: npm run test:unit   (Node 24 runs TypeScript directly)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSSS, computePhilHealth, computePagIbig, withholdingTaxSemiMonthly,
  weekdaysBetween, computeCutoff,
} from '../src/app/lib/phPayroll.ts';

test('SSS 2025: MSC brackets, 5% employee share, caps', () => {
  assert.deepEqual(
    [4_000, 5_249.99, 5_250, 25_000, 34_749, 34_750, 80_000].map((c) => computeSSS(c).msc),
    [5_000, 5_000, 5_500, 25_000, 34_500, 35_000, 35_000],
  );
  const s = computeSSS(25_000);
  assert.equal(s.employee, 1_250);
  assert.equal(s.employeeRegular, 1_000); // MSC 20,000 × 5%
  assert.equal(s.employeeMpf, 250);       // MSC 5,000 × 5% → MPF
  assert.equal(s.employer, 2_500);
  assert.equal(s.ec, 30);
  assert.equal(computeSSS(100_000).employee, 1_750); // max
  assert.equal(computeSSS(10_000).ec, 10);
});

test('PhilHealth 5%: floor ₱10k, ceiling ₱100k, 50/50', () => {
  assert.equal(computePhilHealth(8_000).employee, 250);
  assert.equal(computePhilHealth(25_000).employee, 625);
  assert.equal(computePhilHealth(150_000).employee, 2_500);
});

test('Pag-IBIG: 2% up to ₱10k fund salary, 1% if ≤ ₱1,500', () => {
  assert.equal(computePagIbig(25_000).employee, 200);
  assert.equal(computePagIbig(8_000).employee, 160);
  assert.equal(computePagIbig(1_200).employee, 12);
  assert.equal(computePagIbig(25_000).employer, 200);
});

test('BIR semi-monthly withholding table (2023+)', () => {
  assert.equal(withholdingTaxSemiMonthly(10_000), 0);
  assert.equal(withholdingTaxSemiMonthly(10_417), 0);
  assert.equal(withholdingTaxSemiMonthly(15_000), 687.45);
  assert.equal(withholdingTaxSemiMonthly(20_000), 1_604.1);
  assert.equal(withholdingTaxSemiMonthly(50_000), 8_437.45);
  assert.equal(withholdingTaxSemiMonthly(100_000), 21_770.8);
  assert.equal(withholdingTaxSemiMonthly(400_000), 115_104.15);
});

test('weekdays in Oct 1–15, 2026 = 11', () => {
  assert.equal(weekdaysBetween('2026-10-01', '2026-10-15').length, 11);
});

const fullAttendance = (days: string[]) => days.map((date) => ({ date, hoursWorked: 8, overtime: 0, status: 'Approved' }));

test('₱30,000/month, perfect attendance, Oct 1–15 2026', () => {
  const r = computeCutoff({
    monthlyBasic: 30_000, periodStart: '2026-10-01', periodEnd: '2026-10-15',
    timesheets: fullAttendance(weekdaysBetween('2026-10-01', '2026-10-15')), leaves: [],
  });
  assert.equal(r.earnings.grossPay, 15_000);
  assert.equal(r.deductions.sss, 750);        // 1,500 / 2
  assert.equal(r.deductions.philhealth, 375); // 750 / 2
  assert.equal(r.deductions.pagibig, 100);    // 200 / 2
  assert.equal(r.taxableIncome, 13_775);
  assert.equal(r.deductions.tax, 503.7);      // (13,775 − 10,417) × 15%
  assert.equal(r.netPay, 13_271.3);
  assert.equal(r.deductions.absences, 0);
});

test('absence, paid leave, unpaid leave, unapproved timesheet, overtime', () => {
  const days = weekdaysBetween('2026-10-01', '2026-10-15');
  const ts = fullAttendance(days.slice(3));              // first 3 days not worked
  ts.push({ date: days[0], hoursWorked: 8, overtime: 0, status: 'Submitted' }); // not approved → unpaid
  ts[0].overtime = 2;                                     // 2h OT on an approved day
  const r = computeCutoff({
    monthlyBasic: 30_000, periodStart: '2026-10-01', periodEnd: '2026-10-15', timesheets: ts,
    leaves: [
      { start_date: days[1], end_date: days[1], leave_type: 'Sick Leave', status: 'Approved' },
      { start_date: days[2], end_date: days[2], leave_type: 'Leave Without Pay', status: 'Approved' },
    ],
  });
  const hourly = 30_000 * 12 / 261 / 8;
  assert.equal(r.breakdown.paidLeaveDays, 1);
  assert.equal(r.breakdown.absentHours, 16);              // day 0 (unapproved) + day 2 (LWOP)
  assert.equal(r.deductions.absences, Math.round(16 * hourly * 100) / 100);
  assert.equal(r.earnings.overtimePay, Math.round(2 * hourly * 1.25 * 100) / 100);
  assert.equal(r.netPay, Math.round((r.earnings.grossPay - r.deductions.total) * 100) / 100);
});

test('minimum wage earner pays no withholding tax', () => {
  const monthly = 695 * 261 / 12; // NCR minimum
  const r = computeCutoff({ monthlyBasic: monthly, periodStart: '2026-10-01', periodEnd: '2026-10-15',
    timesheets: fullAttendance(weekdaysBetween('2026-10-01', '2026-10-15')), leaves: [] });
  assert.equal(r.breakdown.minimumWageEarner, true);
  assert.equal(r.deductions.tax, 0);
});

test('absences never exceed the half-month basic', () => {
  const r = computeCutoff({ monthlyBasic: 20_000, periodStart: '2026-10-01', periodEnd: '2026-10-15', timesheets: [], leaves: [] });
  assert.equal(r.deductions.absences, 10_000);
  assert.ok(r.taxableIncome >= 0);
});
