// Run: npm run test:unit   (Node 24 runs TypeScript directly)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countWeekdays, remaining, pendingDaysFor, validateLeave, tallyApproved } from '../src/app/lib/leavePolicy.ts';

test('countWeekdays skips weekends', () => {
  assert.equal(countWeekdays('2026-10-23', '2026-10-26'), 2); // Fri → Mon
  assert.equal(countWeekdays('2026-10-24', '2026-10-25'), 0); // Sat–Sun
  assert.equal(countWeekdays('2026-10-01', '2026-10-31'), 22);
  assert.equal(countWeekdays('2026-10-05', '2026-10-01'), 0);
});

test('remaining subtracts approved and pending days', () => {
  assert.equal(remaining('Vacation Leave', { 'Vacation Leave': 10 }, 3), 2);
  assert.equal(remaining('Emergency Leave', {}), 3);
  assert.equal(remaining('Party Leave', {}), 0);
});

test('validateLeave enforces yearly credits, weekdays and same-year', () => {
  const f = (leave_type: string, start_date: string, end_date: string) => ({ leave_type, start_date, end_date });
  assert.equal(validateLeave(f('Emergency Leave', '2026-10-26', '2026-10-28'), {}, 0), null);
  assert.match(validateLeave(f('Emergency Leave', '2026-10-26', '2026-10-29'), {}, 0)!, /Not enough Emergency Leave/);
  assert.match(validateLeave(f('Vacation Leave', '2026-10-26', '2026-10-27'), { 'Vacation Leave': 14 }, 0)!, /1 left/);
  assert.match(validateLeave(f('Vacation Leave', '2026-10-26', '2026-10-26'), { 'Vacation Leave': 14 }, 1)!, /already pending/);
  assert.match(validateLeave(f('Sick Leave', '2026-12-31', '2027-01-04'), {}, 0)!, /next year/);
  assert.match(validateLeave(f('Sick Leave', '2026-10-24', '2026-10-25'), {}, 0)!, /weekends/);
});

test('pendingDaysFor and tallyApproved group by type and year', () => {
  const reqs = [
    { id: 'a', employee_id: 'E1', leave_type: 'Sick Leave', start_date: '2026-03-02', total_days: 2, status: 'Pending' },
    { id: 'b', employee_id: 'E1', leave_type: 'Sick Leave', start_date: '2025-03-02', total_days: 5, status: 'Pending' },
    { id: 'c', employee_id: 'E1', leave_type: 'Sick Leave', start_date: '2026-04-01', total_days: 1, status: 'Approved' },
    { id: 'd', employee_id: 'E1', leave_type: 'Vacation Leave', start_date: '2026-05-04', total_days: 3, status: 'Approved' },
    { id: 'e', employee_id: 'E2', leave_type: 'Sick Leave', start_date: '2026-05-04', total_days: 1, status: 'Rejected' },
  ];
  assert.equal(pendingDaysFor(reqs, 'Sick Leave', 2026), 2);
  assert.deepEqual(tallyApproved(reqs), {
    E1_2026: { employeeId: 'E1', year: 2026, used: { 'Sick Leave': 1, 'Vacation Leave': 3 } },
  });
});
