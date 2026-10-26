import { X, HelpCircle } from "lucide-react";

type Section = { title: string; items: [string, string][] };

// Admin/HR/Supervisor side (/app)
const STAFF_GUIDE: Section[] = [
  {
    title: "Pages",
    items: [
      ["Dashboard", "Headcount, pending approvals and today's attendance at a glance."],
      ["Employee", "Employee directory. Search, filter by department/status, export to CSV."],
      ["Leave", "Approve or reject leave requests. Filter by status, type and date."],
      ["Time", "Approve timesheets and correction requests, see who is clocked in (Live Attendance)."],
      ["Reports", "Employee, leave, attendance and payroll reports with CSV export."],
      ["Performance", "360° reviews: supervisor 50%, peers 30%, self 20%, plus attendance from timesheets."],
      ["Recruitment", "Job postings, applicants from the Job Portal, interviews and hiring."],
      ["Payroll (admin)", "Run semi-monthly cutoffs and view payslips."],
      ["Admin (admin)", "Create accounts, change roles, disable users."],
    ],
  },
  {
    title: "How to…",
    items: [
      ["Run a 360° review", "Performance → 360° Review → pick employee and quarter → request self + 2–3 peers → fill the supervisor form → Finalize. Choosing \"Training\" also assigns a 30-day training."],
      ["Run payroll", "Payroll → Run Cutoff Computation. Use 1–15 or 16–end of month, after the period ends and its timesheets are approved. Each cutoff can only be run once."],
      ["Fix a wrong time-in", "The employee files a correction; approve it in Time → Timesheets and hours are recomputed."],
      ["Lock someone out", "Admin → set the user's status to Disabled. Access stops immediately."],
      ["Reset a password", "Admin → Change password sends the user a reset email."],
    ],
  },
];

// Employee self-service side (/portal)
const EMPLOYEE_GUIDE: Section[] = [
  {
    title: "Pages",
    items: [
      ["My Profile", "Update your phone, address, emergency contact and photo."],
      ["Attendance", "Time in and time out once per day. Times use the server clock (Manila)."],
      ["Leave", "File leave and see your balance. You can cancel while it's still Pending."],
      ["Payroll", "Your payslips for each cutoff (1–15 and 16–end of month)."],
      ["Requests", "Overtime, time corrections and other requests."],
      ["Training / Evaluation", "Assigned trainings, your reviews, and self/peer evaluations HR asks you to complete."],
    ],
  },
  {
    title: "How to…",
    items: [
      ["Forgot to time out", "File a time correction in Requests; your supervisor approves it."],
      ["Wrong name, role or salary", "Only HR/Admin can change these — contact HR."],
      ["Change your password", "Account menu (your name, top right) → Change Password or Settings."],
    ],
  },
];

export default function HelpDialog({ portal, onClose }: { portal: boolean; onClose: () => void }) {
  const sections = portal ? EMPLOYEE_GUIDE : STAFF_GUIDE;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Help"
      >
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-2xl font-black text-[#1B1717] uppercase tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#810100]" /> Quick Guide
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="text-xs font-black text-[#810100] uppercase tracking-widest mb-3">{section.title}</h3>
              <dl className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                {section.items.map(([term, desc]) => (
                  <div key={term} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 px-5 py-3">
                    <dt className="font-black text-sm text-[#1B1717]">{term}</dt>
                    <dd className="text-sm text-gray-600">{desc}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <p className="text-xs text-gray-400 font-medium">
            Still stuck? Contact your HR administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
