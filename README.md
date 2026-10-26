# CrimsonCloudHR

An HR management system built with **React + Vite + Firebase (Auth, Firestore)**, with three
role-based portals (Admin / Supervisor / Employee) and a companion public Job Portal.

> All data in the live demo is **fake** (generated with Faker on the reserved `crimsoncloud.example` domain).

## Features

- **Role-based access**: admin, HR, supervisor, and employee (ESS), enforced by Firestore security rules, not just the UI
- **Time & attendance**: one tamper-proof record per day, checked against the server clock (Asia/Manila)
- **Leave & requests** with approval workflow (no self-approval) and yearly leave credits in working days, enforced server-side
- **Philippine payroll**: SSS (2025), PhilHealth, Pag-IBIG, BIR TRAIN withholding tax, overtime, absences
- **360° performance reviews** (supervisor 50%, peers 30%, self 20%, plus attendance from timesheets) and training assignments
- **Recruitment**, connected to the public Job Portal (applicants apply anonymously and see only their own applications)
- Audit log, notifications, quota-friendly dashboard

## Getting started

```bash
npm install
cp .env.example .env.local   # add your reCAPTCHA v3 site key (App Check)
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `npm run build` | Vite dev server / production build |
| `npm test` | Unit tests (payroll, 360° scoring, leave credits) + Firestore rules tests (local emulator; needs Java) |
| `npm run seed:dry` / `npm run seed` | Preview / replace all data with fake demo data (needs a service-account key; see docs) |
| `npm run deploy:rules` | Deploy Firestore security rules (Storage isn't set up: it needs the Blaze plan) |
| `npm run deploy` | Build and deploy to Firebase Hosting |

## Documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): going live on the free Spark plan (data reset, rules, App Check, hosting), the tamper-proofing matrix, and the payroll computation rules.

## Credits

UI originally generated from the [HR Dashboard Design](https://www.figma.com/design/PRCsKf4Bp8lyYNXHDxxiUF/HR-Dashboard-Design) Figma file. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
