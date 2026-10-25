/**
 * Security rules tests — run against the local emulator (no quota used):
 *   npm run test:rules
 */
import { readFileSync } from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, collection,
  query, where, or, serverTimestamp,
} from 'firebase/firestore';
import { manilaDate, manilaTime, computeHours } from '../src/app/schemas/timesheet.ts';

let env;
const EMP = { admin: 'EMP-2026-0001', sup: 'EMP-2026-0003', alice: 'EMP-2026-0007', bob: 'EMP-2026-0008' };
const today = manilaDate();
const yesterday = manilaDate(new Date(Date.now() - 864e5));
const shiftMinutes = (hhmm, delta) => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + delta));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

const as = {
  anon: () => env.unauthenticatedContext().firestore(),
  visitor: (uid = 'visitor1') => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore(),
  user: (uid, email) => env.authenticatedContext(uid, { email, firebase: { sign_in_provider: 'password' } }).firestore(),
};
const admin = () => as.user('admin', 'admin@x.example');
const sup = () => as.user('sup', 'sup@x.example');
const alice = () => as.user('alice', 'alice@x.example');
const disabledAdmin = () => as.user('ghost', 'ghost@x.example');

const closedShift = (empId, date) => ({ employeeId: empId, date, timeIn: '08:00', timeOut: '17:00', hoursWorked: 8, overtime: 0, status: 'Submitted' });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-crimsoncloudhr',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const u = (id, role, empId, email, extra = {}) =>
      setDoc(doc(db, 'users', id), { role, employeeId: empId, email, status: 'Enabled', position: 'Staff', ...extra });
    await u('admin', 'admin', EMP.admin, 'admin@x.example');
    await u('sup', 'Supervisor', EMP.sup, 'sup@x.example');
    await u('alice', 'employee', EMP.alice, 'alice@x.example');
    await u('ghost', 'admin', 'EMP-X', 'ghost@x.example', { status: 'Disabled' });
    await setDoc(doc(db, 'employees', 'e-alice'), { employeeId: EMP.alice, email: 'alice@x.example', name: 'Alice' });
    await setDoc(doc(db, 'employees', 'e-new'), { employeeId: 'EMP-2026-0020', email: 'new@x.example', name: 'Newbie' });
    await setDoc(doc(db, 'timesheets', `${EMP.alice}_2026-01-05`), closedShift(EMP.alice, '2026-01-05'));
    await setDoc(doc(db, 'timesheets', `${EMP.sup}_2026-01-05`), closedShift(EMP.sup, '2026-01-05'));
    await setDoc(doc(db, 'timesheets', `${EMP.bob}_${today}`), { employeeId: EMP.bob, date: today, timeIn: '08:00', timeOut: '', hoursWorked: 0, overtime: 0, status: 'Submitted' });
    await setDoc(doc(db, 'leaveRequests', 'lv-alice'), { employee_id: EMP.alice, status: 'Pending', start_date: today, end_date: today });
    await setDoc(doc(db, 'leaveRequests', 'lv-alice-approved'), { employee_id: EMP.alice, status: 'Approved', start_date: today, end_date: today });
    await setDoc(doc(db, 'leaveRequests', 'lv-sup'), { employee_id: EMP.sup, status: 'Pending', start_date: today, end_date: today });
    await setDoc(doc(db, 'performance_evaluations', 'ev-alice'), { employeeId: EMP.alice, rating: 3, evaluator: 'Sup' });
    await setDoc(doc(db, 'trainings', 'tr-alice'), { employeeId: EMP.alice, status: 'Pending' });
    await setDoc(doc(db, 'employeePayrolls', 'pay-alice'), { employeeId: EMP.alice, net: 20000 });
    await setDoc(doc(db, 'jobs', 'open'), { jobTitle: 'Dev', status: 'Open' });
    await setDoc(doc(db, 'jobs', 'closed'), { jobTitle: 'Old', status: 'Closed' });
    await setDoc(doc(db, 'applicants', 'app-v1'), { ownerUid: 'visitor1', name: 'V', status: 'Pending' });
    await setDoc(doc(db, 'applicants', 'app-v2'), { ownerUid: 'visitor2', name: 'W', status: 'Pending' });
    await setDoc(doc(db, 'notifications', 'n-alice'), { employeeId: EMP.alice, isRead: false, type: 'System' });
    await setDoc(doc(db, 'notifications', 'n-all'), { type: 'Announcement', isRead: false });
  });
});

// ---------------- Public job portal ----------------
test('anyone can list OPEN jobs, not closed ones', async () => {
  await assertSucceeds(getDocs(query(collection(as.anon(), 'jobs'), where('status', '==', 'Open'))));
  await assertFails(getDoc(doc(as.anon(), 'jobs/closed')));
  await assertFails(getDocs(collection(as.anon(), 'jobs')));
});

test('unauthenticated users cannot write anything', async () => {
  await assertFails(addDoc(collection(as.anon(), 'applicants'), { ownerUid: 'x', name: 'a', email: 'a', status: 'Pending' }));
  await assertFails(setDoc(doc(as.anon(), 'jobs/hack'), { status: 'Open' }));
  await assertFails(getDoc(doc(as.anon(), 'users/admin')));
});

test('anonymous applicant can apply and see only their own applications', async () => {
  const v = as.visitor();
  await assertSucceeds(addDoc(collection(v, 'applicants'), { ownerUid: 'visitor1', name: 'Me', email: 'me@x.example', status: 'Pending' }));
  await assertFails(addDoc(collection(v, 'applicants'), { ownerUid: 'visitor1', name: 'Me', email: 'me@x.example', status: 'Hired' }));
  await assertFails(addDoc(collection(v, 'applicants'), { ownerUid: 'someone-else', name: 'Me', email: 'e', status: 'Pending' }));
  await assertSucceeds(getDocs(query(collection(v, 'applicants'), where('ownerUid', '==', 'visitor1'))));
  await assertFails(getDocs(collection(v, 'applicants')));
  await assertFails(deleteDoc(doc(v, 'applicants/app-v2')));
  await assertSucceeds(deleteDoc(doc(v, 'applicants/app-v1')));
});

test('anonymous visitor gets no HR access', async () => {
  await assertFails(getDoc(doc(as.visitor(), 'users/admin')));
  await assertFails(getDocs(collection(as.visitor(), 'users')));
  await assertFails(setDoc(doc(as.visitor(), 'users/visitor1'), { role: 'admin', email: 'x', employeeId: 'x', employeeDocId: 'e-alice' }));
  await assertFails(getDocs(query(collection(as.visitor(), 'timesheets'), where('employeeId', '==', EMP.alice))));
});

// ---------------- Attendance: tamper-proofing ----------------
test('employee reads only OWN timesheets', async () => {
  await assertSucceeds(getDocs(query(collection(alice(), 'timesheets'), where('employeeId', '==', EMP.alice))));
  await assertFails(getDocs(query(collection(alice(), 'timesheets'), where('employeeId', '==', EMP.bob))));
  await assertFails(getDocs(collection(alice(), 'timesheets')));
});

test('time-in: today only, server-clock time, one record per day', async () => {
  const now = manilaTime();
  const ts = { employeeId: EMP.alice, employeeName: 'Alice', date: today, timeIn: now, timeInAt: serverTimestamp(), timeOut: '', hoursWorked: 0, overtime: 0, status: 'Submitted' };
  const ref = (id = `${EMP.alice}_${today}`) => doc(alice(), 'timesheets', id);

  await assertFails(addDoc(collection(alice(), 'timesheets'), ts));                         // random ID
  await assertFails(setDoc(ref(), { ...ts, timeIn: shiftMinutes(now, -180) }));               // back-dated time
  await assertFails(setDoc(ref(`${EMP.alice}_${yesterday}`), { ...ts, date: yesterday }));    // back-dated day
  await assertFails(setDoc(ref(`${EMP.bob}_${today}`), { ...ts, employeeId: EMP.bob }));      // someone else
  await assertFails(setDoc(ref(), { ...ts, status: 'Approved' }));                            // self-approval
  await assertFails(setDoc(ref(), { ...ts, hoursWorked: 8 }));                                // pre-filled hours
  await assertSucceeds(setDoc(ref(), ts));
  await assertFails(setDoc(ref(), ts));                                                        // second time-in
});

test('time-out: server-clock time, hours recomputed, then locked', async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'timesheets', `${EMP.alice}_${today}`),
    { employeeId: EMP.alice, date: today, timeIn: '00:00', timeOut: '', hoursWorked: 0, overtime: 0, status: 'Submitted' }));
  const ref = doc(alice(), 'timesheets', `${EMP.alice}_${today}`);
  const now = manilaTime();
  const honest = computeHours('00:00', now);

  await assertFails(updateDoc(ref, { status: 'Approved' }));
  await assertFails(updateDoc(ref, { timeOut: now, timeOutAt: serverTimestamp(), hoursWorked: honest.regular, overtime: honest.overtime + 5 }));
  await assertFails(updateDoc(ref, { timeOut: shiftMinutes(now, 120), timeOutAt: serverTimestamp(), hoursWorked: 8, overtime: 1 }));
  await assertSucceeds(updateDoc(ref, { timeOut: now, timeOutAt: serverTimestamp(), hoursWorked: honest.regular, overtime: honest.overtime }));
  await assertFails(updateDoc(ref, { timeOut: now, timeOutAt: serverTimestamp(), hoursWorked: honest.regular, overtime: honest.overtime }));
  await assertFails(deleteDoc(ref));
});

test('employee cannot touch old or other timesheets', async () => {
  await assertFails(updateDoc(doc(alice(), 'timesheets', `${EMP.alice}_2026-01-05`), { timeOut: '20:00' }));
  await assertFails(updateDoc(doc(alice(), 'timesheets', `${EMP.bob}_${today}`), { status: 'Approved' }));
});

test('supervisor approves others but never their own timesheet', async () => {
  await assertSucceeds(updateDoc(doc(sup(), 'timesheets', `${EMP.alice}_2026-01-05`), { status: 'Approved' }));
  await assertFails(updateDoc(doc(sup(), 'timesheets', `${EMP.sup}_2026-01-05`), { status: 'Approved' }));
  await assertFails(updateDoc(doc(sup(), 'timesheets', `${EMP.alice}_2026-01-05`), { hoursWorked: 12 }));
  const fix = computeHours('07:00', '18:00');
  await assertSucceeds(updateDoc(doc(sup(), 'timesheets', `${EMP.alice}_2026-01-05`), { timeIn: '07:00', timeOut: '18:00', hoursWorked: fix.regular, overtime: fix.overtime }));
  await assertSucceeds(updateDoc(doc(admin(), 'timesheets', `${EMP.sup}_2026-01-05`), { status: 'Approved' }));
});

// ---------------- Leave ----------------
test('employee leave: create own, cancel only while pending, never approve', async () => {
  const lv = { employee_id: EMP.alice, status: 'Pending', start_date: today, end_date: today, leave_type: 'Vacation Leave', reason: 'x' };
  await assertSucceeds(addDoc(collection(alice(), 'leaveRequests'), lv));
  await assertFails(addDoc(collection(alice(), 'leaveRequests'), { ...lv, employee_id: EMP.bob }));
  await assertFails(addDoc(collection(alice(), 'leaveRequests'), { ...lv, status: 'Approved' }));
  await assertFails(addDoc(collection(alice(), 'leaveRequests'), { ...lv, end_date: '2026-01-01' }));
  await assertFails(updateDoc(doc(alice(), 'leaveRequests/lv-alice'), { status: 'Approved' }));
  await assertFails(updateDoc(doc(alice(), 'leaveRequests/lv-alice'), { end_date: '2026-12-31' }));
  await assertFails(updateDoc(doc(alice(), 'leaveRequests/lv-alice-approved'), { status: 'Cancelled' }));
  await assertSucceeds(updateDoc(doc(alice(), 'leaveRequests/lv-alice'), { status: 'Cancelled' }));
});

test('supervisor approves others leave, not their own, and cannot change dates', async () => {
  await assertSucceeds(updateDoc(doc(sup(), 'leaveRequests/lv-alice'), { status: 'Approved' }));
  await assertFails(updateDoc(doc(sup(), 'leaveRequests/lv-sup'), { status: 'Approved' }));
  await assertFails(updateDoc(doc(sup(), 'leaveRequests/lv-alice-approved'), { end_date: '2026-12-31' }));
});

// ---------------- Evaluations & training ----------------
test('evaluations: employees read-only; managers cannot self-evaluate or edit after submit', async () => {
  await assertSucceeds(getDocs(query(collection(alice(), 'performance_evaluations'), where('employeeId', '==', EMP.alice))));
  await assertFails(updateDoc(doc(alice(), 'performance_evaluations/ev-alice'), { rating: 5 }));
  await assertFails(addDoc(collection(alice(), 'performance_evaluations'), { employeeId: EMP.alice, rating: 5 }));
  await assertFails(deleteDoc(doc(alice(), 'performance_evaluations/ev-alice')));

  await assertSucceeds(addDoc(collection(sup(), 'performance_evaluations'), { employeeId: EMP.alice, rating: 4 }));
  await assertFails(addDoc(collection(sup(), 'performance_evaluations'), { employeeId: EMP.sup, rating: 5 }));
  await assertFails(updateDoc(doc(sup(), 'performance_evaluations/ev-alice'), { rating: 1 }));
  await assertSucceeds(updateDoc(doc(admin(), 'performance_evaluations/ev-alice'), { rating: 4 }));
});

test('employee cannot mark own training complete', async () => {
  await assertFails(updateDoc(doc(alice(), 'trainings/tr-alice'), { status: 'Completed' }));
  await assertSucceeds(updateDoc(doc(sup(), 'trainings/tr-alice'), { status: 'Completed' }));
});

// ---------------- Profiles, payroll, notifications ----------------
test('employee edits only personal profile fields', async () => {
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { role: 'admin' }));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { employeeId: EMP.bob }));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { position: 'CEO' }));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { vlBalance: 99 }));
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { phone: '0917', lastLogin: new Date(), imageUrl: 'x' }));
  await assertFails(getDoc(doc(alice(), 'users/sup')));
});

test('employee reads own payslip only, never writes payroll', async () => {
  await assertSucceeds(getDocs(query(collection(alice(), 'employeePayrolls'), where('employeeId', '==', EMP.alice))));
  await assertFails(getDocs(collection(alice(), 'employeePayrolls')));
  await assertFails(updateDoc(doc(alice(), 'employeePayrolls/pay-alice'), { net: 999999 }));
});

test('employee notifications: filtered OR query works, unfiltered fails', async () => {
  const q = query(collection(alice(), 'notifications'), or(where('type', '==', 'Announcement'), where('employeeId', '==', EMP.alice)));
  await assertSucceeds(getDocs(q));
  await assertFails(getDocs(collection(alice(), 'notifications')));
  await assertSucceeds(updateDoc(doc(alice(), 'notifications/n-alice'), { isRead: true }));
  await assertFails(updateDoc(doc(alice(), 'notifications/n-all'), { isRead: true }));
});

// ---------------- Claim account (self-registration) ----------------
test('new user can claim ONLY a matching employee record, only as employee', async () => {
  const me = () => as.user('newuid', 'new@x.example');
  await assertSucceeds(getDocs(query(collection(me(), 'employees'), where('email', '==', 'new@x.example'), where('employeeId', '==', 'EMP-2026-0020'))));
  await assertFails(getDocs(query(collection(me(), 'employees'), where('employeeId', '==', EMP.alice))));
  const profile = { uid: 'newuid', email: 'new@x.example', employeeId: 'EMP-2026-0020', employeeDocId: 'e-new', role: 'employee', status: 'Enabled' };
  await assertFails(setDoc(doc(me(), 'users/newuid'), { ...profile, role: 'admin' }));
  await assertFails(setDoc(doc(me(), 'users/newuid'), { ...profile, employeeDocId: 'e-alice', employeeId: EMP.alice }));
  await assertFails(setDoc(doc(me(), 'users/otheruid'), profile));
  await assertSucceeds(setDoc(doc(me(), 'users/newuid'), profile));
});

// ---------------- Supervisor / admin ----------------
test('supervisor reads employee data', async () => {
  await assertSucceeds(getDocs(collection(sup(), 'employees')));
  await assertSucceeds(getDocs(collection(sup(), 'timesheets')));
  await assertSucceeds(getDocs(collection(sup(), 'employeePayrolls')));
});

test('supervisor CANNOT edit payroll, employees, users/roles or audit logs', async () => {
  await assertFails(updateDoc(doc(sup(), 'employeePayrolls/pay-alice'), { net: 1 }));
  await assertFails(addDoc(collection(sup(), 'payrollPeriods'), { start: today }));
  await assertFails(updateDoc(doc(sup(), 'employees/e-alice'), { name: 'X' }));
  await assertFails(updateDoc(doc(sup(), 'users/alice'), { role: 'admin' }));
  await assertFails(updateDoc(doc(sup(), 'users/sup'), { role: 'admin' }));
  await assertFails(setDoc(doc(sup(), 'settings/app'), { maintenance: true }));
  await assertFails(getDocs(collection(sup(), 'audit_logs')));
});

test('admin has full access', async () => {
  await assertSucceeds(updateDoc(doc(admin(), 'employeePayrolls/pay-alice'), { net: 25000 }));
  await assertSucceeds(updateDoc(doc(admin(), 'users/alice'), { role: 'supervisor' }));
  await assertSucceeds(setDoc(doc(admin(), 'settings/app'), { maintenance: false }));
  await assertSucceeds(getDocs(collection(admin(), 'audit_logs')));
  await assertSucceeds(deleteDoc(doc(admin(), 'timesheets', `${EMP.bob}_${today}`)));
});

test('disabled admin is locked out', async () => {
  await assertFails(getDocs(collection(disabledAdmin(), 'employees')));
  await assertFails(updateDoc(doc(disabledAdmin(), 'employeePayrolls/pay-alice'), { net: 1 }));
});

test('audit logs: append-only, about yourself', async () => {
  const log = { action: 'login_success', email: 'alice@x.example', status: 'success', timestamp: serverTimestamp() };
  await assertSucceeds(addDoc(collection(alice(), 'audit_logs'), log));
  await assertFails(addDoc(collection(alice(), 'audit_logs'), { ...log, email: 'admin@x.example' }));
  await assertFails(addDoc(collection(as.anon(), 'audit_logs'), log));
});
