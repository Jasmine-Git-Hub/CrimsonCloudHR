import React, { useState, useEffect } from 'react';
import { 
  DollarSign, FileText, Download, TrendingUp, 
  ArrowDownCircle, ArrowUpCircle, Wallet, Loader2 
} from 'lucide-react';
import { auth, db } from '../../../config/firebaseSetup';
import { 
  collection, query, where, doc, getDoc, onSnapshot 
} from 'firebase/firestore';

// --- BAGONG INTERFACE BASE SA PAYROLL ENGINE ---
interface PayslipData {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  periodStart: string;
  periodEnd: string;
  basicSalary: number;
  earnings: { 
    basicPay: number; 
    overtimePay: number; 
    allowances: number; 
    grossPay: number; 
  };
  deductions: { 
    sss: number; 
    philhealth: number; 
    pagibig: number; 
    tax: number; 
    total: number; 
    absences: number; 
  };
  netPay: number;
  payDate: string;
  status: string;
}

const Payslip: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<PayslipData[]>([]);
  const [userProfile, setUserProfile] = useState({ name: '', employeeId: '' });

  // --- 1. FETCH DATA (Mula sa employeePayrolls) ---
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const fetchProfile = async () => {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const empId = data.employeeId || 'TBA';
        setUserProfile({
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.username || 'Employee',
          employeeId: empId
        });

        // Real-time Listener para sa Payslips ng naka-login na user
        // FIX: Binago natin mula 'payslips' papuntang 'employeePayrolls'
        const q = query(collection(db, 'employeePayrolls'), where('employeeId', '==', empId));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list: PayslipData[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as PayslipData);
          });
          // Sort: Pinakabago sa taas (base sa periodStart)
          setPayslips(list.sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()));
          setLoading(false);
        });

        return () => unsubscribe();
      } else {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const latest = payslips[0];

  // --- 2. EXPORT ALL FUNCTION (CSV) ---
  const handleExportAll = () => {
    if (payslips.length === 0) {
      alert("Walang payslip records na pwedeng i-export sa ngayon.");
      return;
    }

    // In-update ang headers para sa bagong format
    const headers = [
      "Period Start", "Period End", "Base Salary (Cutoff)", "OT Pay", "Allowances", "Gross Pay", 
      "Absences Deduction", "SSS", "PhilHealth", "Pag-IBIG", "Tax", "Total Deductions", "Net Pay", "Pay Date"
    ];
    
    const rows = payslips.map(p => [
      p.periodStart,
      p.periodEnd,
      p.earnings.basicPay,
      p.earnings.overtimePay,
      p.earnings.allowances,
      p.earnings.grossPay,
      p.deductions.absences,
      p.deductions.sss,
      p.deductions.philhealth,
      p.deductions.pagibig,
      p.deductions.tax,
      p.deductions.total,
      p.netPay,
      p.payDate
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Salary_History_${userProfile.employeeId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 3. EXPORT INDIVIDUAL FUNCTION (CSV) ---
  const handleExportIndividual = (payslip: PayslipData) => {
    const headers = [
      "Period Start", "Period End", "Base Salary (Cutoff)", "OT Pay", "Allowances", "Gross Pay", 
      "Absences Deduction", "SSS", "PhilHealth", "Pag-IBIG", "Tax", "Total Deductions", "Net Pay", "Pay Date"
    ];
    
    const row = [
      payslip.periodStart,
      payslip.periodEnd,
      payslip.earnings.basicPay,
      payslip.earnings.overtimePay,
      payslip.earnings.allowances,
      payslip.earnings.grossPay,
      payslip.deductions.absences,
      payslip.deductions.sss,
      payslip.deductions.philhealth,
      payslip.deductions.pagibig,
      payslip.deductions.tax,
      payslip.deductions.total,
      payslip.netPay,
      payslip.payDate
    ];

    const csvContent = [headers.join(","), row.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Payslip_${payslip.periodStart}_${payslip.periodEnd}_${userProfile.employeeId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- HELPER PARA SA CURRENCY ---
  const formatPHP = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#810100] w-10 h-10"/></div>;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-[#1B1717] tracking-tight uppercase">Payroll & Payslip</h1>
          <p className="text-sm text-gray-500">View your earnings, deductions, and payment history</p>
        </div>
        <button 
          onClick={handleExportAll}
          className="flex items-center gap-2 bg-[#810100] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-[#630000] shadow-md transition-all active:scale-95"
        >
          <Download className="w-4 h-4"/> Export All
        </button>
      </div>

      {!latest ? (
        <div className="bg-white p-20 rounded-2xl border-2 border-dashed text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
          No payslip records found in the database.
        </div>
      ) : (
        <>
          {/* LATEST PAYSLIP BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* NET PAY SUMMARY CARD */}
            <div className="lg:col-span-1 bg-[#810100] rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
              <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
              <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Current Net Pay</p>
              <h2 className="text-4xl font-black mb-1">{formatPHP(latest.netPay)}</h2>
              <p className="text-sm font-bold opacity-70">Period: {latest.periodStart} to {latest.periodEnd}</p>
              
              <div className="mt-8 pt-8 border-t border-white/20 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Gross Earnings</span>
                  <span className="font-bold text-green-200">{formatPHP(latest.earnings.grossPay)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Total Deductions</span>
                  <span className="font-bold text-red-200">-{formatPHP(latest.deductions.total)}</span>
                </div>
              </div>
            </div>

            {/* DETAILED BREAKDOWN CARDS */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-green-600 mb-6 font-black uppercase text-xs tracking-widest">
                  <ArrowUpCircle className="w-4 h-4"/> Earnings Breakdown
                </div>
                <div className="space-y-4">
                  <BreakdownRow label="Basic Pay (Cutoff)" value={latest.earnings.basicPay} />
                  <BreakdownRow label="Overtime Pay" value={latest.earnings.overtimePay} />
                  <BreakdownRow label="Allowances / Claims" value={latest.earnings.allowances} />
                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <BreakdownRow label="Total Gross Pay" value={latest.earnings.grossPay} isBold />
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-red-600 mb-6 font-black uppercase text-xs tracking-widest">
                  <ArrowDownCircle className="w-4 h-4"/> Deductions Breakdown
                </div>
                <div className="space-y-4">
                  <BreakdownRow label="Absences / Lates" value={latest.deductions.absences} isDeduction />
                  <BreakdownRow label="SSS Contribution" value={latest.deductions.sss} isDeduction />
                  <BreakdownRow label="PhilHealth" value={latest.deductions.philhealth} isDeduction />
                  <BreakdownRow label="Pag-IBIG" value={latest.deductions.pagibig} isDeduction />
                  <BreakdownRow label="Withholding Tax" value={latest.deductions.tax} isDeduction />
                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <BreakdownRow label="Total Deductions" value={latest.deductions.total} isDeduction isBold />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SALARY HISTORY TABLE */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b flex items-center gap-2 bg-gray-50/50">
              <TrendingUp className="w-5 h-5 text-[#810100]" />
              <h2 className="font-black text-[#1B1717] uppercase tracking-tight text-xs">Salary History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#EDEBDD] border-b">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600">Pay Period</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600">Gross Pay</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600">Deductions</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600 font-bold">Net Pay</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payslips.map((pay) => (
                    <tr key={pay.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#1B1717]">{pay.periodStart} to {pay.periodEnd}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-700">{formatPHP(pay.earnings.grossPay)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-red-600">
                        -{formatPHP(pay.deductions.total)}
                      </td>
                      <td className="px-6 py-4 font-black text-[#810100] text-lg">{formatPHP(pay.netPay)}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleExportIndividual(pay)} className="p-2 hover:bg-[#fce8e8] rounded-lg text-[#810100] transition-all" title="Export CSV">
                          <FileText className="w-4 h-4"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- HELPER COMPONENT ---
const BreakdownRow = ({ label, value, isDeduction, isBold }: { label: string, value: number, isDeduction?: boolean, isBold?: boolean }) => (
  <div className={`flex justify-between items-center py-1 ${isBold ? 'mt-2' : ''}`}>
    <span className={`text-sm ${isBold ? 'font-black text-[#1B1717]' : 'font-bold text-gray-500'}`}>{label}</span>
    <span className={`text-sm ${isBold ? 'font-black text-lg' : 'font-bold'} ${isDeduction ? 'text-red-600' : 'text-[#1B1717]'}`}>
      {isDeduction && value > 0 ? '-' : ''} {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)}
    </span>
  </div>
);

export default Payslip;