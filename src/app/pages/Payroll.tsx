import { useState, useEffect } from "react";
import {
  DollarSign, Calendar, Download, Search, CheckCircle, Loader2, Plus, 
  Calculator, Building, FileText, FileSpreadsheet, Eye, X, Receipt
} from "lucide-react";
import { collection, getDocs, doc, query, where, onSnapshot, writeBatch } from "firebase/firestore";
import { format } from "date-fns";
import { db } from "../../config/firebaseSetup";
import { computeCutoff, round2, PH_PAYROLL, type CutoffResult, type CutoffTimesheet, type CutoffLeave } from "../lib/phPayroll";

// --- INTERFACES ---
interface PayrollPeriod {
  id?: string;
  periodStart: string;
  periodEnd: string;
  cutoffDate: string;
  status: "Processed";
  totalEmployees: number;
  totalGross: number;
  totalGovt: number;
  totalTax: number;
  totalNet: number;
  createdAt: string;
}

interface EmployeePayroll {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  periodStart: string;
  periodEnd: string;
  basicSalary: number;
  earnings: { basicPay: number; overtimePay: number; allowances: number; grossPay: number };
  deductions: { sss: number; philhealth: number; pagibig: number; tax: number; total: number; absences: number };
  netPay: number;
  // Present on payslips computed with the PH engine (older ones lack them)
  taxableIncome?: number;
  employerShare?: CutoffResult["employerShare"];
  breakdown?: CutoffResult["breakdown"];
  payDate: string;
  status: "Processed" | "Paid";
}

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  basicSalary: number;
}

export default function Payroll() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [employeePayrolls, setEmployeePayrolls] = useState<EmployeePayroll[]>([]);
  
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<EmployeePayroll | null>(null);
  const [payrollForm, setPayrollForm] = useState({
    periodStart: "", periodEnd: "", cutoffDate: "",
  });

  // ==============================
  // 🛡️ REAL-TIME DATA FETCHING
  // ==============================
  useEffect(() => {
    setLoading(true);
    
    const fetchEmployees = async () => {
      const empSnap = await getDocs(collection(db, "employees"));
      setEmployees(empSnap.docs.filter(d => d.data().status !== "Inactive").map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, employeeId: data.employeeId, name: data.name, 
          department: data.department || "General", basicSalary: Number(data.basicSalary) || 25000 
        } as Employee;
      }));
    };
    fetchEmployees();

    const unsubPeriods = onSnapshot(collection(db, "payrollPeriods"), (snap) => {
      const periods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollPeriod));
      setPayrollPeriods(periods.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    const unsubPayslips = onSnapshot(collection(db, "employeePayrolls"), (snap) => {
      const payslips = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeePayroll));
      setEmployeePayrolls(payslips.sort((a, b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime()));
      setLoading(false);
    });

    return () => { unsubPeriods(); unsubPayslips(); };
  }, []);

  // ==============================
  // ⚙️ PAYROLL ENGINE — Philippine statutory rules live in ../lib/phPayroll.ts
  // ==============================
  const processBulkPayroll = async () => {
    const { periodStart, periodEnd } = payrollForm;
    if (!periodStart || !periodEnd) return alert("Please fill start and end dates.");
    if (periodEnd < periodStart) return alert("Period end must be on or after period start.");
    if (payrollPeriods.some(p => p.periodStart === periodStart && p.periodEnd === periodEnd)) {
      return alert("This cutoff has already been processed.");
    }
    setProcessing(true);

    try {
      const [tsSnap, leaveSnap, claimsSnap] = await Promise.all([
        getDocs(query(collection(db, "timesheets"), where("date", ">=", periodStart), where("date", "<=", periodEnd))),
        // Filtered client-side by date overlap: a leave can start before the cutoff.
        getDocs(query(collection(db, "leaveRequests"), where("status", "==", "Approved"))),
        getDocs(query(collection(db, "claims"), where("status", "==", "Approved"))),
      ]);
      const allTimesheets = tsSnap.docs.map(d => d.data() as CutoffTimesheet & { employeeId: string });
      const allLeaves = leaveSnap.docs.map(d => d.data() as CutoffLeave & { employee_id?: string; employeeId?: string });
      const allClaims = claimsSnap.docs.map(d => d.data());

      const periodId = `${periodStart}_${periodEnd}`;
      const payDate = format(new Date(), "yyyy-MM-dd");
      const writes: Array<[ReturnType<typeof doc>, Record<string, unknown>]> = [];
      const totals = { gross: 0, govt: 0, tax: 0, net: 0 };

      for (const emp of employees) {
        const reimbursements = allClaims
          .filter(c => c.employeeId === emp.employeeId && c.createdAt >= periodStart && c.createdAt <= periodEnd + "T23:59:59")
          .reduce((sum, c) => sum + Number(c.amount || 0), 0);

        const r = computeCutoff({
          monthlyBasic: emp.basicSalary,
          periodStart,
          periodEnd,
          timesheets: allTimesheets.filter(ts => ts.employeeId === emp.employeeId),
          leaves: allLeaves.filter(l => (l.employee_id ?? l.employeeId) === emp.employeeId),
          reimbursements,
        });

        totals.gross += r.earnings.grossPay;
        totals.govt += r.deductions.sss + r.deductions.philhealth + r.deductions.pagibig;
        totals.tax += r.deductions.tax;
        totals.net += r.netPay;

        // Deterministic ID → re-running the same cutoff can never duplicate payslips.
        writes.push([doc(db, "employeePayrolls", `${periodId}_${emp.employeeId}`), {
          employeeId: emp.employeeId,
          employeeName: emp.name,
          department: emp.department,
          periodStart,
          periodEnd,
          basicSalary: emp.basicSalary,
          ...r,
          payDate,
          status: "Processed",
        }]);
        writes.push([doc(collection(db, "notifications")), {
          title: "New Payslip Generated",
          message: `Your payslip for ${periodStart} to ${periodEnd} cutoff is now available.`,
          type: "System",
          date: payDate,
          isRead: false,
          employeeId: emp.employeeId,
        }]);
      }

      writes.push([doc(db, "payrollPeriods", periodId), {
        periodStart,
        periodEnd,
        cutoffDate: payrollForm.cutoffDate || payDate,
        status: "Processed",
        totalEmployees: employees.length,
        totalGross: round2(totals.gross),
        totalGovt: round2(totals.govt),
        totalTax: round2(totals.tax),
        totalNet: round2(totals.net),
        createdAt: new Date().toISOString(),
      }]);

      // Firestore batches hold max 500 writes; commit in chunks.
      for (let i = 0; i < writes.length; i += 450) {
        const batch = writeBatch(db);
        writes.slice(i, i + 450).forEach(([ref, data]) => batch.set(ref, data));
        await batch.commit();
      }

      alert("Payroll computed successfully!");
      setShowProcessModal(false);
    } catch (error) {
      console.error(error);
      alert("Error calculating payroll.");
    } finally {
      setProcessing(false);
    }
  };

  const latestPeriod = payrollPeriods[0] || null;
  const filteredPayslips = latestPeriod 
    ? employeePayrolls.filter(p => p.periodStart === latestPeriod.periodStart && p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="p-8 space-y-6 bg-[#f8f9fa] min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#1B1717] tracking-tight">Payroll & Salary</h1>
          <p className="text-gray-500 font-medium">PH statutory engine: SSS · PhilHealth · Pag-IBIG · BIR (synced with Time, Leave & Claims)</p>
        </div>
        <button onClick={() => setShowProcessModal(true)} className="flex items-center gap-2 bg-[#810100] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#630000] shadow-lg active:scale-95 transition-all">
          <Calculator className="w-5 h-5" /> Run Cutoff Computation
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#810100]"/></div>
      ) : (
        <>
          {latestPeriod ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 text-[#810100] font-black">
                  <Calendar className="w-5 h-5"/>
                  <span>Cutoff Period: {latestPeriod.periodStart} to {latestPeriod.periodEnd}</span>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">{latestPeriod.totalEmployees} Employees Processed</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border-t-4 border-t-blue-500 p-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Total Gross</p>
                  <p className="text-3xl font-black text-[#1B1717]">₱{latestPeriod.totalGross.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  <p className="text-xs font-medium text-gray-500 mt-1">Basic + Claims + OT</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border-t-4 border-t-orange-500 p-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Building className="w-3 h-3"/> Gov't Deductions</p>
                  <p className="text-3xl font-black text-[#1B1717]">₱{latestPeriod.totalGovt.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  <p className="text-xs font-medium text-gray-500 mt-1">50% Employee Share</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border-t-4 border-t-purple-500 p-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><FileSpreadsheet className="w-3 h-3"/> Withholding Tax</p>
                  <p className="text-3xl font-black text-[#1B1717]">₱{latestPeriod.totalTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  <p className="text-xs font-medium text-gray-500 mt-1">BIR Semi-Monthly</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border-t-4 border-t-green-500 p-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Receipt className="w-3 h-3"/> Total Net Pay</p>
                  <p className="text-3xl font-black text-green-700">₱{latestPeriod.totalNet.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  <p className="text-xs font-medium text-gray-500 mt-1">Disbursed Take-home</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-lg font-black text-[#1B1717]">Employee Cutoff Breakdown</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search employee..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none text-sm font-bold"/>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#EDEBDD] border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Employee</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest text-blue-800">Gross Pay</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest text-orange-800">SSS</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest text-orange-800">PHIC</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest text-orange-800">HDMF</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest text-green-800">Net Pay</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-600 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPayslips.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#1B1717]">{p.employeeName}</div>
                            <div className="text-[10px] font-black text-[#810100] bg-[#fce8e8] inline-block px-2 py-0.5 rounded mt-1 tracking-widest">{p.employeeId}</div>
                          </td>
                          <td className="px-6 py-4 font-bold text-blue-900">₱{p.earnings.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-6 py-4 font-semibold text-orange-700">₱{p.deductions.sss.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-6 py-4 font-semibold text-orange-700">₱{p.deductions.philhealth.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-6 py-4 font-semibold text-orange-700">₱{p.deductions.pagibig.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-6 py-4 font-black text-green-700 text-lg">₱{p.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => { setSelectedPayroll(p); setShowViewModal(true); }} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 mx-auto transition-colors">
                              <Eye className="w-3 h-3"/> Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-500">No Payroll Processed Yet</h3>
              <p className="text-sm text-gray-400 mt-1">Click "Run Cutoff Computation" to get started.</p>
            </div>
          )}
        </>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
             <div className="flex items-center justify-between p-6 bg-[#810100] text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">Payroll Details</h3>
              <button onClick={() => { setShowViewModal(false); setSelectedPayroll(null); }} className="hover:rotate-90 transition-transform">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h4 className="text-lg font-black text-[#1B1717] mb-4">Employee Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Employee Name</span>
                      <span className="text-sm font-medium text-[#1B1717]">{selectedPayroll.employeeName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Employee ID</span>
                      <span className="text-sm font-medium text-[#1B1717]">{selectedPayroll.employeeId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Department</span>
                      <span className="text-sm font-medium text-[#1B1717]">{selectedPayroll.department}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pay Period</span>
                      <span className="text-sm font-medium text-[#1B1717]">{selectedPayroll.periodStart} to {selectedPayroll.periodEnd}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${selectedPayroll.status === 'Processed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {selectedPayroll.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h4 className="text-lg font-black text-[#1B1717] mb-4">Earnings</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Basic Pay (½ month)</span>
                      <span className="text-sm font-medium text-green-700">₱{selectedPayroll.earnings.basicPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                        Overtime Pay{selectedPayroll.breakdown ? ` (${selectedPayroll.breakdown.overtimeHours}h × 125%)` : ""}
                      </span>
                      <span className="text-sm font-medium text-green-700">₱{selectedPayroll.earnings.overtimePay.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Reimbursements (non-taxable)</span>
                      <span className="text-sm font-medium text-green-700">₱{selectedPayroll.earnings.allowances.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Gross Pay</span>
                        <span className="text-lg font-black text-blue-700">₱{selectedPayroll.earnings.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h4 className="text-lg font-black text-[#1B1717] mb-4">Deductions</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                        SSS{selectedPayroll.breakdown ? ` (MSC ₱${selectedPayroll.breakdown.sssMsc.toLocaleString()})` : ""}
                      </span>
                      <span className="text-sm font-medium text-red-700">₱{selectedPayroll.deductions.sss.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">PhilHealth</span>
                      <span className="text-sm font-medium text-red-700">₱{selectedPayroll.deductions.philhealth.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pag-IBIG</span>
                      <span className="text-sm font-medium text-red-700">₱{selectedPayroll.deductions.pagibig.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                        Withholding Tax{selectedPayroll.breakdown?.minimumWageEarner ? " (MWE – exempt)" : ""}
                      </span>
                      <span className="text-sm font-medium text-red-700">₱{selectedPayroll.deductions.tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                        Absences / Undertime{selectedPayroll.breakdown ? ` (${selectedPayroll.breakdown.absentHours}h)` : ""}
                      </span>
                      <span className="text-sm font-medium text-red-700">₱{selectedPayroll.deductions.absences.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Total Deductions</span>
                        <span className="text-lg font-black text-red-700">₱{selectedPayroll.deductions.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedPayroll.employerShare && selectedPayroll.breakdown && (
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <h4 className="text-lg font-black text-[#1B1717] mb-1">Employer Share</h4>
                    <p className="text-xs text-gray-500 mb-4">Paid by the company — not deducted from the employee.</p>
                    <div className="space-y-2 text-sm">
                      {([
                        ["SSS", selectedPayroll.employerShare.sss],
                        ["SSS EC", selectedPayroll.employerShare.ec],
                        ["PhilHealth", selectedPayroll.employerShare.philhealth],
                        ["Pag-IBIG", selectedPayroll.employerShare.pagibig],
                      ] as const).map(([label, value]) => (
                        <div key={label} className="flex justify-between">
                          <span className="font-bold text-gray-500 uppercase tracking-wider">{label}</span>
                          <span className="font-medium text-gray-700">₱{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      Daily rate ₱{selectedPayroll.breakdown.dailyRate.toLocaleString()} (×12 ÷ {PH_PAYROLL.workDaysPerYear}) ·
                      {" "}{selectedPayroll.breakdown.workingDays} working days · {selectedPayroll.breakdown.paidLeaveDays} paid leave ·
                      {" "}taxable ₱{(selectedPayroll.taxableIncome ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                  <h4 className="text-lg font-black text-green-800 mb-4">Net Pay Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Gross Pay</span>
                      <span className="text-sm font-medium text-green-700">₱{selectedPayroll.earnings.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Deductions</span>
                      <span className="text-sm font-medium text-red-700">-₱{selectedPayroll.deductions.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="border-t-2 border-green-300 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-black text-green-800 uppercase tracking-wider">Net Pay</span>
                        <span className="text-2xl font-black text-green-700">₱{selectedPayroll.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pay Date</span>
                      <span className="text-sm font-medium text-[#1B1717]">{selectedPayroll.payDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
             <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => { setShowViewModal(false); setSelectedPayroll(null); }} className="px-6 py-3 bg-[#1B1717] text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-black transition-colors shadow-md">
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {showProcessModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-[#810100] text-white flex justify-between items-center">
              <h3 className="text-xl font-black tracking-tight uppercase">Setup Cutoff Run</h3>
              <button onClick={() => setShowProcessModal(false)}><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Period Start</label>
                <input type="date" value={payrollForm.periodStart} onChange={e => setPayrollForm({...payrollForm, periodStart: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl font-bold focus:border-[#810100] outline-none" required/>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Period End</label>
                <input type="date" value={payrollForm.periodEnd} onChange={e => setPayrollForm({...payrollForm, periodEnd: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl font-bold focus:border-[#810100] outline-none" required/>
              </div>

              <div className="bg-[#fce8e8] border border-[#810100]/20 p-4 rounded-xl mt-4">
                <h4 className="text-xs font-black text-[#810100] uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Computation Sequence</h4>
                <ul className="text-xs font-medium text-gray-700 space-y-1.5 ml-6 list-disc">
                  <li>Basic = monthly ÷ 2; daily rate = monthly × 12 ÷ 261</li>
                  <li>Only <b>approved</b> timesheets & paid leaves count; missing hours = absences</li>
                  <li>Overtime at <b>125%</b> of hourly rate (Labor Code Art. 87)</li>
                  <li><b>SSS</b> 5% of MSC · <b>PhilHealth</b> 2.5% · <b>Pag-IBIG</b> 2% (max ₱200) — half per cutoff</li>
                  <li><b>BIR</b> TRAIN semi-monthly table; minimum wage earners exempt</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setShowProcessModal(false)} className="px-6 py-3 border border-gray-200 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={processBulkPayroll} disabled={processing} className="px-6 py-3 bg-[#810100] text-white font-black rounded-xl hover:bg-[#630000] shadow-lg disabled:opacity-50 flex items-center gap-2 transition-transform active:scale-95 uppercase tracking-wide">
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                {processing ? "Computing..." : "Run Cutoff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}