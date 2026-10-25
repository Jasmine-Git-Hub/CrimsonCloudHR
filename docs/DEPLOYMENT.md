# CrimsonCloudHR — Going Live Safely (Spark / free plan)

Do these **in order**. Steps 1–3 must happen before the repo goes public.

---

## 1. Replace the real data (classmates' names and emails)

The seeder wipes **every** collection that can hold personal data (`users`, `employees`,
`timesheets`, `leaveRequests`, `requests`, `notifications`, `applicants`, `audit_logs` (it stores
emails and user agents), payroll, recruitment, etc.). It also deletes **all Firebase Auth accounts**
and uploaded profile photos, then creates 20 fake employees on the reserved domain
`crimsoncloud.example`.

1. Firebase Console → ⚙ Project settings → **Service accounts** → *Generate new private key*.
   Save it as `serviceAccountKey.json` in the project root. It's git-ignored, but never commit it.
2. Preview what will be deleted:
   ```bash
   npm run seed:dry
   ```
3. Run it for real:
   ```bash
   npm run seed                       # password for all demo logins: DemoPass#2026
   SEED_PASSWORD='Something#Else1' npm run seed   # …or choose your own
   ```
4. **Delete `serviceAccountKey.json`** and, in Google Cloud Console → IAM → Service Accounts →
   Keys, delete that key. A leaked admin key bypasses every security rule.

Demo logins: `admin@crimsoncloud.example`, `supervisor@crimsoncloud.example`,
`employee@crimsoncloud.example`.

> ⚠️ The seeder uses deletes and writes from your daily free quota (20k each). One run uses well under 1k.

## 2. Turn on the auth settings the new code needs

Firebase Console → **Authentication**:
- **Sign-in method → Anonymous → Enable.** The Job Portal signs applicants in anonymously, so
  Firestore never accepts unauthenticated writes and "My Applications" shows only your own applications.
- **Settings → User actions → Email enumeration protection → Enable.**
- **Settings → Authorized domains:** add your production domain(s).

## 3. Deploy the security rules

```bash
npx firebase login
npm test                 # 9 payroll tests + 22 emulator rules tests (RBAC, tamper-proofing)
npm run deploy:rules     # deploys firestore.rules + storage.rules
```

What the rules enforce (see `firestore.rules`):

| | Public | Applicant (anon) | Employee / ESS | Supervisor | HR | Admin |
|---|---|---|---|---|---|---|
| Open jobs | read | read | read | read/write | read/write | all |
| Applicants | – | create + own | – | read/write | read/write | all |
| Own timesheets / leave / requests | – | – | read + create, cancel own | all + approve | all + approve | all |
| Employees master | – | – | own record (limited fields) | **read** | read/write | all |
| Payroll (`employeePayrolls`, `payrollPeriods`, `claims`) | – | – | own payslip | **read only** | **read only** | all |
| `users` roles/status, `settings`, `audit_logs` | – | – | own profile (not role) | read users | read users | all |

Any role with `status: "Disabled"` loses all access immediately.

## 4. Firebase App Check (reCAPTCHA v3): stop bots draining your quota

App Check makes Firestore reject requests that don't come from **your** website (curl
scripts, copied API keys, bots). It's free on Spark.

1. **Create a reCAPTCHA v3 key** at https://www.google.com/recaptcha/admin/create
   - Type: *Score based (v3)*
   - Domains: your production domains for both apps (e.g. `crimsoncloudhr.web.app`, `crimsoncloud-jobs.web.app`).
     Don't add `localhost`; local dev uses a debug token (step 4).
2. **Register it in Firebase:** Console → **App Check** → Apps → your web app → *reCAPTCHA* →
   paste the **secret key** → Save.
3. **Add the site key to both apps** (it's public):
   ```bash
   cp .env.example .env.local          # then set VITE_RECAPTCHA_SITE_KEY=6Lc...
   ```
   The init code is already in `src/config/firebaseSetup.ts` (and the Job Portal's copy). It runs
   `initializeAppCheck()` before any Firestore call.
4. **Local dev:** run `npm run dev`, open the browser console, and copy the line
   `App Check debug token: xxxxxxxx-...`. Then go to Console → App Check → Apps → ⋮ → *Manage debug tokens* → add it.
   Put the same value in `VITE_APPCHECK_DEBUG_TOKEN` so it stays stable.
5. **Deploy both apps, then watch** Console → App Check → *APIs → Cloud Firestore* for 1–2 days.
   When "verified requests" is ~100%, click **Enforce** for Cloud Firestore (and Storage).

> Enforce only **after** both apps ship with App Check, or you'll lock out your own users.
> `firebase-admin` (the seeder) bypasses App Check, so it keeps working.

## 5. Other free-tier abuse protections

- **Restrict the API key:** Google Cloud Console → APIs & Services → Credentials → *Browser key* →
  Application restrictions → **HTTP referrers** → add `https://YOUR-DOMAIN/*` and `http://localhost:5173/*`.
  The key in `firebaseSetup.ts` is public by design. This restriction stops other sites from using it.
- **Spark can't bill you.** Abuse at worst hits the daily caps (50k reads / 20k writes) until the
  next reset. `Dashboard.tsx` now uses server-side `getCountFromServer()` queries (~15 reads per
  load, refreshed every 5 min) instead of live-downloading every employee, leave and timesheet.
- Each `get()` in the rules costs 1 read per request (not per document), which is fine at this scale.

## 6. Publish to GitHub

Repo: `github.com/Jasmine-Git-Hub/crimsonCloudHR` (renamed from `hr-dashboard-design`;
GitHub redirects the old URL). `.gitignore` keeps `node_modules/`, `dist/`, `.env.local` and
service-account keys out of Git — check `git status` before every push.

## 7. Host it (free)

```bash
npm run deploy        # vite build && firebase deploy --only hosting
```
`.env.local` values are baked in at build time, so build on the machine or CI that has them.
For the Job Portal, add a second Hosting site (`firebase hosting:sites:create crimsoncloud-jobs`)
and deploy its `dist/` there, or use Vercel/Netlify with `VITE_RECAPTCHA_SITE_KEY` set.

---

## Code changes made for these rules (why each was needed)

Rules aren't filters: a query that *could* return a forbidden document is rejected as a
whole. These pages were changed so their queries match the rules:

| File | Change |
|---|---|
| `pages/Login.tsx` | Signs in **first**, then reads `users/{uid}`. The old flow read `users` while logged out, which would require a public users collection. The client-side lockout was removed; Firebase Auth throttles brute force (`auth/too-many-requests`). |
| `components/ClaimAccount.tsx` | Creates the Auth account, *then* verifies against `employees` (rules allow reading only the record with your own email), deletes the Auth account if there's no match, and stores `employeeDocId` for the rules to check. |
| `pages/Admin.tsx` | **Stopped saving plaintext passwords in Firestore.** It now creates real Auth accounts on a temporary secondary app. "Change password" sends a reset email instead. |
| `components/NotificationBell.tsx`, `employee/Notifications.tsx` | Query `or(type == Announcement, employeeId == me)` instead of every notification. |
| `employee/MyEvaluation.tsx` | Employees query only their own evaluations (managers still see all). |
| `pages/Search.tsx` | Timesheet search used `employee_id`, but timesheets store `employeeId`. Role check is now case-insensitive. |
| `employee/AttendanceEmployee.tsx` | Zod validation, server timestamps, **Manila** date/time read at save, one document per day (`<employeeId>_<date>`), skeleton loader. |
| `pages/Time.tsx` | Approving a time correction now recomputes `hoursWorked`/`overtime` (previously payroll kept paying the old hours). |
| `pages/Dashboard.tsx` | Count queries instead of three full-collection live listeners. |
| `pages/Payroll.tsx` + `lib/phPayroll.ts` | Philippine statutory payroll (below). |
| `components/ProtectedRoute.tsx` + `routes.tsx` | Role from `users/{uid}` only (no more `position` → role guessing), disabled accounts signed out, `/app/admin`, `/app/payroll` and `/app/audit-logs` are admin-only, lookups cached. |
| Job Portal `JobDetails.tsx` / `MyApplications.tsx` | Anonymous session + `ownerUid`. Previously **every visitor could see and delete every applicant's application**. |

## Tamper-proofing: what employees can and can't change

| Record | Employee | Supervisor / HR | Admin |
|---|---|---|---|
| **Timesheet** | Time-in once per day, time-out once. Date must be **today** and both times within **±5 min of the server clock (Asia/Manila)**. Hours are **recomputed by the rules**. Can't approve, edit afterwards, or delete. | Approve/correct **other people's** records only. Hours must still match the times. | Anything |
| **Leave / requests** | File own, cancel **only while Pending** | Approve/reject others only; can't change dates or type | Anything |
| **Evaluation** | Read own only | Create for **others** only; **final once submitted** | Correct/delete |
| **Training** | Read own only | Assign/update | Anything |
| **Profile** | Personal fields only (name, phone, address, emergency contact, photo) | — | Role, status, IDs, balances |
| **Payslip** | Read own only | Read | Compute (Payroll page) |

## Payroll: Philippine statutory computation (`src/app/lib/phPayroll.ts`)

Semi-monthly cutoffs for monthly-paid employees. Rates live in one `PH_PAYROLL` constant;
update it when a new circular or wage order comes out.

| Item | Rule used |
|---|---|
| Basic pay | Monthly ÷ 2 per cutoff. Daily rate = monthly × 12 ÷ 261, hourly = daily ÷ 8 |
| Absences / undertime | (Working days in cutoff × 8h − approved hours − paid leave) × hourly rate. Unapproved timesheets and *Leave Without Pay* count as absent |
| Overtime | 125% of hourly rate (Labor Code Art. 87, ordinary day) |
| **SSS** (2025 schedule) | 15% of MSC (₱5,000–₱35,000, ₱500 steps): employee **5%** (max ₱1,750/mo), employer 10% + EC ₱10/₱30. MSC above ₱20,000 goes to MPF |
| **PhilHealth** | 5% of basic, floor ₱10k / ceiling ₱100k, split 50/50 → employee **₱250–₱2,500/mo** |
| **Pag-IBIG** | 2% of up to ₱10,000 → employee **max ₱200/mo** (1% if ≤ ₱1,500), employer 2% |
| **Withholding tax** | BIR TRAIN semi-monthly table (2023+) on basic − absences + OT − employee contributions. Minimum wage earners exempt |
| Contributions per cutoff | Half of the monthly amount each cutoff |
| Reimbursements (approved claims) | Added to gross, non-taxable |

Worked example (tested): ₱30,000/month, full attendance, Oct 1–15 2026 → gross ₱15,000, SSS ₱750,
PhilHealth ₱375, Pag-IBIG ₱100, taxable ₱13,775, tax ₱503.70, **net ₱13,271.30**.
Not modelled yet (timesheets don't record them): night differential, rest-day/holiday premiums,
13th-month pay, de minimis benefits.

## Known limitations

- There is no 2-step verification anymore (the old OTP was generated in the browser and could
  be bypassed). If you want real MFA later, Firebase Auth supports TOTP/SMS MFA via Identity Platform.
- `Admin.tsx` → *Delete user* removes the Firestore profile only. The Auth account remains,
  but it has no access without a profile. Deleting Auth users needs the Admin SDK.
- Roles come from Firestore, not custom claims. Setting custom claims requires a trusted server
  (Cloud Functions need the Blaze plan), so Firestore-stored roles are the practical choice on Spark.
