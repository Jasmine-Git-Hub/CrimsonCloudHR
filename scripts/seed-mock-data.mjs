#!/usr/bin/env node
/**
 * CrimsonCloudHR — Data sanitization + mock data seeder
 *
 * WIPES every collection that can contain real personal data, deletes ALL
 * Firebase Auth users and uploaded profile photos, then seeds 20 fake
 * employees with matching Auth accounts, timesheets, leave requests, etc.
 *
 * Usage:
 *   node scripts/seed-mock-data.mjs              → dry run (shows what would happen)
 *   node scripts/seed-mock-data.mjs --confirm    → actually wipe + seed
 *
 * Credentials (pick one):
 *   - put the service account JSON at ./serviceAccountKey.json  (git-ignored), or
 *   - set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *
 * Optional env: SEED_PASSWORD (password for every demo login, default below)
 */
import { readFileSync, existsSync } from 'node:fs';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { faker } from '@faker-js/faker';
// Shared with the app (Node 24 runs these .ts files directly).
import { computeHours } from '../src/app/schemas/timesheet.ts';
import { DEPARTMENTS as DEPARTMENT_NAMES } from '../src/app/lib/departments.ts';

const CONFIRM = process.argv.includes('--confirm');
const PROJECT_ID = 'crimsoncloudhr';
const STORAGE_BUCKET = 'crimsoncloudhr.firebasestorage.app';
// RFC 2606 reserved domain — can never belong to a real person.
const EMAIL_DOMAIN = 'crimsoncloud.example';
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'DemoPass#2026';
const EMPLOYEE_COUNT = 20;

// Every collection the apps write to. All may hold real names/emails/IPs.
const COLLECTIONS_TO_WIPE = [
  'users', 'employees', 'attendance', 'timesheets', 'leaveRequests', 'requests',
  'notifications', 'performance_evaluations', 'trainings', 'employeePayrolls',
  'payrollPeriods', 'claims', 'applicants', 'interviews', 'evaluations',
  'hiringDecisions', 'audit_logs', 'jobs',
];

// Job titles per department (names must match src/app/lib/departments.ts).
const HR_DEPT = 'Human Resources (HR)';
const DEPARTMENTS = {
  [HR_DEPT]: ['HR Generalist', 'Recruitment Specialist', 'HR Assistant'],
  'Information Technology (IT)': ['Software Engineer', 'IT Support Specialist', 'Systems Administrator', 'QA Analyst'],
  'Finance / Accounting': ['Accountant', 'Payroll Officer', 'Financial Analyst'],
  'Marketing': ['Marketing Associate', 'Content Strategist', 'Social Media Specialist'],
  'Operations': ['Operations Coordinator', 'Logistics Officer', 'Customer Support Lead'],
};
for (const d of Object.keys(DEPARTMENTS)) {
  if (!DEPARTMENT_NAMES.includes(d)) throw new Error(`Unknown department: ${d}`);
}

// 2 admins, 4 supervisors, 14 employees (first of each = documented demo login)
const ROLE_PLAN = ['admin', 'admin', 'supervisor', 'supervisor', 'supervisor', 'supervisor',
  ...Array(EMPLOYEE_COUNT - 6).fill('employee')];

faker.seed(2026); // deterministic: re-running yields the same fake people

// ---------------------------------------------------------------------------
function initFirebase() {
  const keyPath = './serviceAccountKey.json';
  const credential = existsSync(keyPath)
    ? cert(JSON.parse(readFileSync(keyPath, 'utf8')))
    : applicationDefault();
  initializeApp({ credential, projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET });
}

const iso = (d) => d.toISOString().split('T')[0];
const hhmm = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const atTime = (dateStr, time) => Timestamp.fromDate(new Date(`${dateStr}T${time}:00+08:00`));

function businessDaysBack(n) {
  const days = [];
  const d = new Date();
  d.setDate(d.getDate() - 1);
  while (days.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(iso(d));
    d.setDate(d.getDate() - 1);
  }
  return days.reverse();
}

// ---------------------------------------------------------------------------
async function wipe(db, auth) {
  console.log('\n🧹 WIPING REAL DATA');

  for (const name of COLLECTIONS_TO_WIPE) {
    const count = (await db.collection(name).count().get()).data().count;
    console.log(`   ${name.padEnd(24)} ${count} docs`);
    if (CONFIRM && count > 0) await db.recursiveDelete(db.collection(name));
  }

  let pageToken;
  let authTotal = 0;
  do {
    const page = await auth.listUsers(1000, pageToken);
    authTotal += page.users.length;
    if (CONFIRM && page.users.length) await auth.deleteUsers(page.users.map((u) => u.uid));
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`   ${'Auth users'.padEnd(24)} ${authTotal} accounts`);

  try {
    const [files] = await getStorage().bucket().getFiles({ prefix: 'profile-images/' });
    console.log(`   ${'Storage profile-images'.padEnd(24)} ${files.length} files`);
    if (CONFIRM && files.length) await getStorage().bucket().deleteFiles({ prefix: 'profile-images/' });
  } catch (err) {
    console.log(`   Storage skipped (${err.message.split('\n')[0]})`);
  }
}

// ---------------------------------------------------------------------------
function buildPeople() {
  const year = new Date().getFullYear();
  const deptNames = Object.keys(DEPARTMENTS);

  return ROLE_PLAN.map((role, i) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const department = role === 'admin' ? HR_DEPT : deptNames[i % deptNames.length];
    const isFirstOfRole = ROLE_PLAN.indexOf(role) === i;
    const email = isFirstOfRole
      ? `${role}@${EMAIL_DOMAIN}`
      : `${firstName}.${lastName}.${i}@${EMAIL_DOMAIN}`.toLowerCase().replace(/[^a-z0-9.@]/g, '');

    return {
      role,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      employeeId: `EMP-${year}-${String(i + 1).padStart(4, '0')}`,
      department,
      jobTitle: role === 'admin' ? 'HR Administrator'
        : role === 'supervisor' ? `${department} Supervisor`
        : faker.helpers.arrayElement(DEPARTMENTS[department]),
      phone: faker.phone.number({ style: 'national' }),
      address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
      hireDate: iso(faker.date.past({ years: 5 })),
      basicSalary: faker.number.int({ min: 22000, max: 85000 }),
    };
  });
}

async function seed(db, auth) {
  console.log('\n🌱 SEEDING MOCK DATA');
  const people = buildPeople();
  if (!CONFIRM) {
    console.log(`   would create ${people.length} employees + Auth accounts, e.g.:`);
    people.slice(0, 5).forEach((p) => console.log(`     ${p.role.padEnd(10)} ${p.email}  (${p.name}, ${p.department})`));
    return people;
  }

  const writer = db.bulkWriter();
  const supervisors = people.filter((p) => p.role === 'supervisor');

  for (const p of people) {
    const user = await auth.createUser({
      email: p.email,
      password: DEMO_PASSWORD,
      displayName: p.name,
      emailVerified: true,
    });
    p.uid = user.uid;

    const empRef = db.collection('employees').doc();
    writer.set(empRef, {
      name: p.name, employeeId: p.employeeId, email: p.email, phone: p.phone,
      department: p.department, jobTitle: p.jobTitle, status: 'Active',
      hireDate: p.hireDate, basicSalary: p.basicSalary, role: p.role,
    });

    writer.set(db.collection('users').doc(p.uid), {
      uid: p.uid, email: p.email, firstName: p.firstName, lastName: p.lastName,
      name: p.name, username: p.email.split('@')[0], employeeId: p.employeeId,
      employeeDocId: empRef.id, position: p.jobTitle, department: p.department,
      role: p.role, status: 'Enabled', phone: p.phone, address: p.address,
      vlBalance: 15, slBalance: 15, createdAt: new Date().toISOString(),
    });
  }

  // ---- timesheets: last 15 business days, ~90% attendance ----
  const days = businessDaysBack(15);
  let tsCount = 0;
  for (const p of people) {
    for (const date of days) {
      if (faker.number.float() < 0.1) continue;
      const inH = faker.helpers.weightedArrayElement([{ value: 7, weight: 2 }, { value: 8, weight: 6 }, { value: 9, weight: 2 }]);
      const inM = faker.number.int({ min: 0, max: 59 });
      // Mostly a full 9h span (8h + 1h break); some undertime, some overtime.
      const spanMinutes = faker.helpers.weightedArrayElement([
        { value: 9 * 60, weight: 6 }, { value: faker.number.int({ min: 420, max: 530 }), weight: 2 },
        { value: faker.number.int({ min: 570, max: 690 }), weight: 2 },
      ]);
      const outTotal = inH * 60 + inM + spanMinutes;
      const timeIn = hhmm(inH, inM);
      const timeOut = hhmm(Math.floor(outTotal / 60), outTotal % 60);
      const { regular, overtime } = computeHours(timeIn, timeOut); // same formula as the app + rules
      // ID "<employeeId>_<date>" = one record per day (enforced by firestore.rules)
      writer.set(db.collection('timesheets').doc(`${p.employeeId}_${date}`), {
        employeeId: p.employeeId, employeeName: p.name, date, timeIn, timeOut,
        timeInAt: atTime(date, timeIn), timeOutAt: atTime(date, timeOut),
        hoursWorked: regular,
        overtime,
        status: faker.helpers.weightedArrayElement([{ value: 'Approved', weight: 7 }, { value: 'Submitted', weight: 3 }]),
      });
      tsCount++;
    }
  }

  // ---- leave requests ----
  const leaveTypes = ['Vacation Leave', 'Sick Leave', 'Emergency Leave'];
  let leaveCount = 0;
  for (const p of people.filter((x) => x.role !== 'admin')) {
    const n = faker.number.int({ min: 0, max: 3 });
    for (let k = 0; k < n; k++) {
      const start = faker.date.between({ from: new Date(Date.now() - 60 * 864e5), to: new Date(Date.now() + 30 * 864e5) });
      const totalDays = faker.number.int({ min: 1, max: 3 });
      const end = new Date(start.getTime() + (totalDays - 1) * 864e5);
      const status = start > new Date()
        ? faker.helpers.arrayElement(['Pending', 'Pending', 'Approved'])
        : faker.helpers.arrayElement(['Approved', 'Approved', 'Rejected']);
      writer.set(db.collection('leaveRequests').doc(), {
        employee_id: p.employeeId, employeeName: p.name,
        leave_type: faker.helpers.arrayElement(leaveTypes),
        start_date: iso(start), end_date: iso(end), total_days: totalDays,
        reason: faker.helpers.arrayElement(['Family event', 'Medical check-up', 'Personal matters', 'Out-of-town trip', 'Fever and flu']),
        status, dateSubmitted: iso(new Date(start.getTime() - 7 * 864e5)),
        ...(status !== 'Pending' && { remarks: status === 'Approved' ? 'Approved' : 'Insufficient coverage that week' }),
      });
      leaveCount++;
    }
  }

  // ---- overtime / adjustment requests ----
  for (const p of faker.helpers.arrayElements(people, 6)) {
    writer.set(db.collection('requests').doc(), {
      request_type: faker.helpers.arrayElement(['Overtime', 'Time Adjustment']),
      date_effective: faker.helpers.arrayElement(days), reason: 'Project deadline',
      employee_id: p.employeeId, employee_name: p.name,
      status: faker.helpers.arrayElement(['Pending', 'Approved']),
      date_submitted: iso(new Date()), details: {},
    });
  }

  // ---- trainings, evaluations, notifications ----
  for (const p of people) {
    writer.set(db.collection('trainings').doc(), {
      title: `Onboarding: ${p.jobTitle} Essentials`,
      description: `Core responsibilities of a ${p.jobTitle} in ${p.department}.`,
      status: faker.helpers.arrayElement(['Pending', 'In Progress', 'Completed']),
      dueDate: iso(faker.date.soon({ days: 30 })), employeeId: p.employeeId,
      link: 'https://example.com/training',
    });
    if (p.role === 'employee') {
      const evaluator = faker.helpers.arrayElement(supervisors);
      writer.set(db.collection('performance_evaluations').doc(), {
        employeeId: p.employeeId, employeeName: p.name, department: p.department,
        evaluator: evaluator.name, evaluatorId: evaluator.employeeId,
        rating: faker.number.float({ min: 2.5, max: 5, fractionDigits: 1 }),
        comments: faker.helpers.arrayElement(['Consistently meets deadlines.', 'Great team player.', 'Needs improvement on documentation.']),
        dateEvaluated: iso(faker.date.recent({ days: 60 })), status: 'Completed',
      });
    }
    writer.set(db.collection('notifications').doc(), {
      title: 'Welcome to CrimsonCloudHR', message: 'Your demo account is ready.',
      type: 'System', date: iso(new Date()), isRead: false, employeeId: p.employeeId,
    });
  }
  writer.set(db.collection('notifications').doc(), {
    title: 'Company Town Hall', message: 'Join us this Friday at 3PM in the main hall.',
    type: 'Announcement', date: iso(new Date()), isRead: false,
  });

  // ---- public job postings ----
  for (const [dept, titles] of Object.entries(DEPARTMENTS)) {
    writer.set(db.collection('jobs').doc(), {
      jobTitle: titles[0], department: dept, level: 'Mid-Level',
      description: faker.lorem.paragraph(), requirements: faker.lorem.sentences(3),
      employmentType: 'Full-time', salaryRange: '₱30,000 - ₱50,000',
      status: 'Open', datePosted: iso(faker.date.recent({ days: 20 })),
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await writer.close();
  console.log(`   ✔ ${people.length} users/employees, ${tsCount} timesheets, ${leaveCount} leave requests,`);
  console.log('     6 requests, trainings, evaluations, notifications, 5 open jobs');
  return people;
}

// ---------------------------------------------------------------------------
async function main() {
  initFirebase();
  const db = getFirestore();
  const auth = getAuth();

  console.log(`Project: ${PROJECT_ID}   Mode: ${CONFIRM ? '⚠️  LIVE (destructive)' : 'DRY RUN'}`);
  await wipe(db, auth);
  const people = await seed(db, auth);

  console.log('\n🔑 Demo logins (password for all: ' + (CONFIRM ? DEMO_PASSWORD : '<SEED_PASSWORD>') + ')');
  for (const r of ['admin', 'supervisor', 'employee']) {
    console.log(`   ${r.padEnd(10)} ${people.find((p) => p.role === r).email}`);
  }
  if (!CONFIRM) console.log('\nNothing was changed. Re-run with --confirm to apply.');
}

main().catch((err) => {
  console.error('\n❌ Seeder failed:', err);
  process.exit(1);
});
