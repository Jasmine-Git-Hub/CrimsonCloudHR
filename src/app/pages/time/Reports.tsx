import { useState, useEffect } from "react";
import { Download, Users, Calendar, Clock, DollarSign, BarChart3, FileText, Filter, Loader2 } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebaseSetup"; 

export default function Reports() {
  const [activeReport, setActiveTab] = useState("employee");
  const [loading, setLoading] = useState(true);

  // States para sa totoong data mula Firebase
  const [empStats, setEmpStats] = useState({ total: 0, active: 0, newHires: 0 });
  const [leaveStats, setLeaveStats] = useState({ approved: 0, pending: 0 });
  const [timeStats, setTimeStats] = useState({ totalLogs: 0, pendingApprove: 0 });

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Employee Statistics
        const empSnap = await getDocs(collection(db, "employees"));
        let activeCount = 0;
        let newHiresCount = 0;
        const currentYear = new Date().getFullYear().toString();

        empSnap.forEach(doc => {
          const data = doc.data();
          if (data.status === "Active" || data.status === "active") activeCount++;
          // Basic check kung na-hire ngayong taon
          if (data.hireDate && typeof data.hireDate === 'string' && data.hireDate.startsWith(currentYear)) {
            newHiresCount++;
          }
        });
        setEmpStats({ total: empSnap.size, active: activeCount, newHires: newHiresCount });

        // 2. Fetch Leave Statistics
        const leaveSnap = await getDocs(collection(db, "leaveRequests"));
        let approvedCount = 0;
        let pendingCount = 0;
        leaveSnap.forEach(doc => {
          const d = doc.data();
          if (d.status === "Approved") approvedCount++;
          if (d.status === "Pending") pendingCount++;
        });
        setLeaveStats({ approved: approvedCount, pending: pendingCount });

        // 3. Fetch Timesheet/Attendance Statistics
        const timeSnap = await getDocs(collection(db, "timesheets"));
        let pendingTimeCount = 0;
        timeSnap.forEach(doc => {
          if (doc.data().status === "Submitted") pendingTimeCount++;
        });
        setTimeStats({ totalLogs: timeSnap.size, pendingApprove: pendingTimeCount });

      } catch (error) {
        console.error("Error fetching report data:", error);
      }
      setLoading(false);
    };

    fetchReportData();
  }, []);

  const exportReport = (reportName: string) => {
    // Pwedeng palitan ito ng totoong CSV export logic sa future
    alert(`Initiating download for ${reportName.toUpperCase()} Report...`);
    window.print(); // Simple way to save the view as PDF for now
  };

  const reportTabs = [
    { id: "employee", label: "Employee Reports", icon: Users },
    { id: "leave", label: "Leave Reports", icon: Calendar },
    { id: "attendance", label: "Attendance Reports", icon: Clock },
    { id: "payroll", label: "Payroll Reports", icon: DollarSign },
  ];

  return (
    <div className="p-8 space-y-8 bg-[#F8F9FA] min-h-screen max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B1717] tracking-tight uppercase">System Reports</h1>
          <p className="text-gray-500 font-medium">Generate and download comprehensive HR analytics and data.</p>
        </div>
        <button 
          onClick={() => exportReport(activeReport)}
          className="flex items-center gap-2 px-6 py-3 bg-[#810100] text-white rounded-xl font-bold shadow-lg hover:bg-[#630000] transition-colors"
        >
          <Download className="w-4 h-4" /> Export Current Report
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {reportTabs.map((tab) => {
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                isActive 
                  ? "bg-[#810100] border-[#810100] text-white shadow-lg translate-y--1" 
                  : "bg-white border-gray-100 text-gray-500 hover:border-[#810100]/30 hover:bg-[#810100]/5"
              }`}
            >
              <div className={`p-3 rounded-xl ${isActive ? 'bg-white/20' : 'bg-gray-50'}`}>
                <tab.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
              </div>
              <span className={`font-black uppercase tracking-widest text-xs ${isActive ? 'text-white' : 'text-[#1B1717]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Report Dashboard Area */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[400px]">
        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-[#810100]" />
            <h2 className="text-xl font-black text-[#1B1717] uppercase tracking-tight">
              {reportTabs.find(t => t.id === activeReport)?.label} Overview
            </h2>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border-2 border-gray-100 rounded-xl hover:bg-gray-50 font-bold text-gray-600 text-sm">
            <Filter className="w-4 h-4" /> Filter Data
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48">
             <Loader2 className="w-10 h-10 animate-spin text-[#810100] mb-4" />
             <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Generating Data...</p>
          </div>
        ) : (
          <>
            {/* 1. EMPLOYEE REPORT VIEW */}
            {activeReport === "employee" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Headcount</p>
                    <p className="text-4xl font-black text-[#1B1717]">{empStats.total}</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Active Employees</p>
                    <p className="text-4xl font-black text-green-600">{empStats.active}</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">New Hires (This Year)</p>
                    <p className="text-4xl font-black text-[#810100]">{empStats.newHires}</p>
                  </div>
                </div>
                <div className="bg-[#fce8e8] border border-[#810100]/20 p-8 rounded-2xl flex items-center justify-center h-32">
                  <p className="text-[#810100] font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5"/> Detailed Employee Directory Ready for Export
                  </p>
                </div>
              </div>
            )}

            {/* 2. LEAVE REPORT VIEW */}
            {activeReport === "leave" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Total Approved Leaves</p>
                    <p className="text-4xl font-black text-blue-900">{leaveStats.approved}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">Pending Leave Requests</p>
                    <p className="text-4xl font-black text-yellow-900">{leaveStats.pending}</p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-8 rounded-2xl flex items-center justify-center h-32">
                  <p className="text-gray-500 font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5"/> Leave Balances & History Report Ready for Export
                  </p>
                </div>
              </div>
            )}

            {/* 3. ATTENDANCE REPORT VIEW */}
            {activeReport === "attendance" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Timesheet Logs</p>
                    <p className="text-4xl font-black text-[#1B1717]">{timeStats.totalLogs}</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pending Timesheet Approvals</p>
                    <p className="text-4xl font-black text-orange-500">{timeStats.pendingApprove}</p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-8 rounded-2xl flex items-center justify-center h-32">
                  <p className="text-gray-500 font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5"/> Timesheet Summary & Logs Ready for Export
                  </p>
                </div>
              </div>
            )}

            {/* 4. PAYROLL REPORT VIEW */}
            {activeReport === "payroll" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-100 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">System Status</p>
                    <p className="text-2xl font-black text-green-900 flex items-center gap-2">
                      <DollarSign className="w-6 h-6"/> Payroll Module Active
                    </p>
                  </div>
                  <div className="bg-[#fce8e8] border border-[#810100]/20 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-[#810100]/60 uppercase tracking-widest mb-2">Employees in Database</p>
                    <p className="text-4xl font-black text-[#810100]">{empStats.total}</p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-8 rounded-2xl flex items-center justify-center h-32">
                  <p className="text-gray-500 font-bold flex items-center gap-2">
                    <DollarSign className="w-5 h-5"/> Salary Details & Disbursement Report Ready for Export
                  </p>
                </div>
              </div>
            )}
          </  >
        )}
      </div>
    </div>
  );
}