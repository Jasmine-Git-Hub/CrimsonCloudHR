import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Clock, CheckCircle, FileText, Calendar, Timer, 
  TrendingUp, Users, PieChart, ArrowRight, Activity, AlertCircle
} from "lucide-react";
import { collection, query, where, getDocs, getCountFromServer } from "firebase/firestore";
import { format, startOfMonth } from "date-fns";
import { db } from "../../config/firebaseSetup";
import { DEPARTMENTS } from "../lib/departments";

interface DashboardStats {
  totalEmployees: number;
  newHiresThisMonth: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // States para sa accurate data
  const [stats, setStats] = useState<DashboardStats>({ totalEmployees: 0, newHiresThisMonth: 0 });
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingTimesheets, setPendingTimesheets] = useState(0);
  const [onLeaveNames, setOnLeaveNames] = useState<string[]>([]);
  const [departmentData, setDepartmentData] = useState<Record<string, number>>({});
  
  // State para sa "Time at Work" Timer & Overtime Logic
  const [sessionTime, setSessionTime] = useState({ h: 0, m: 0, s: 0 });
  const [showOvertimePrompt, setShowOvertimePrompt] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const [shiftEnded, setShiftEnded] = useState(false);

  // ==============================
  // 1. ADMIN SESSION TIMER LOGIC (WITH OVERTIME & RESET)
  // ==============================
  useEffect(() => {
    const today = new Date().toLocaleDateString();
    let storedDate = sessionStorage.getItem("adminSessionDate");

    // RESET KINABUKASAN: Kung hindi na match ang date ngayon sa naka-save na date
    if (storedDate !== today) {
      sessionStorage.removeItem("adminSessionStart");
      sessionStorage.removeItem("adminSessionOvertime");
      sessionStorage.removeItem("adminSessionEnded");
      sessionStorage.setItem("adminSessionDate", today);
    }

    // Set or get start time
    let start = sessionStorage.getItem("adminSessionStart");
    if (!start) {
      start = Date.now().toString();
      sessionStorage.setItem("adminSessionStart", start);
    }

    // Load saved statuses
    const savedOvertime = sessionStorage.getItem("adminSessionOvertime") === "true";
    const savedEnded = sessionStorage.getItem("adminSessionEnded") === "true";
    
    setIsOvertime(savedOvertime);
    setShiftEnded(savedEnded);

    // Kung tapos na ang shift, i-freeze ang time sa 8 hours at wag na i-run ang timer
    if (savedEnded) {
      setSessionTime({ h: 8, m: 0, s: 0 });
      return;
    }

    const timer = setInterval(() => {
      // Double check kung sakaling na-update ang storage mula sa modal
      if (sessionStorage.getItem("adminSessionEnded") === "true") return;

      const diffMs = Date.now() - parseInt(start!);
      const totalSeconds = Math.floor(diffMs / 1000);
      
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      
      setSessionTime({ h, m, s });

      // OVERTIME CHECK: 8 hours = 28,800 seconds
      // NOTE: Para i-test ito agad nang hindi naghihintay ng 8 hrs, palitan ang 28800 ng 10 (10 seconds)
      if (totalSeconds >= 28800) {
        const otStatus = sessionStorage.getItem("adminSessionOvertime");
        const endStatus = sessionStorage.getItem("adminSessionEnded");
        
        if (otStatus !== "true" && endStatus !== "true") {
          setShowOvertimePrompt(true);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAcceptOvertime = () => {
    sessionStorage.setItem("adminSessionOvertime", "true");
    setIsOvertime(true);
    setShowOvertimePrompt(false);
  };

  const handleDeclineOvertime = () => {
    sessionStorage.setItem("adminSessionEnded", "true");
    setShiftEnded(true);
    setShowOvertimePrompt(false);
    setSessionTime({ h: 8, m: 0, s: 0 }); // I-lock ang display sa 8 hours
  };

  // ==============================
  // 2. DATA FETCHING (quota-friendly)
  // ==============================
  // Server-side COUNT queries cost ~1 read each, instead of downloading every
  // employee / leave / timesheet document (and re-downloading on every change)
  // like the old onSnapshot listeners did. Refreshes on mount and every 5 min.
  useEffect(() => {
    let cancelled = false;

    const count = async (q: Parameters<typeof getCountFromServer>[0]) =>
      (await getCountFromServer(q)).data().count;

    const load = async () => {
      try {
        const employees = collection(db, "employees");
        const leaves = collection(db, "leaveRequests");
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const monthStartStr = format(startOfMonth(new Date()), "yyyy-MM-dd");

        const [total, newHires, pendingLv, pendingTs, deptCounts, activeLeaves] = await Promise.all([
          count(employees),
          count(query(employees, where("hireDate", ">=", monthStartStr))),
          count(query(leaves, where("status", "==", "Pending"))),
          count(query(collection(db, "timesheets"), where("status", "==", "Submitted"))),
          Promise.all(DEPARTMENTS.map((d) => count(query(employees, where("department", "==", d))))),
          // Only leaves that haven't ended yet — a small set, no composite index needed.
          getDocs(query(leaves, where("end_date", ">=", todayStr))),
        ]);
        if (cancelled) return;

        const depts: Record<string, number> = {};
        DEPARTMENTS.forEach((d, i) => { if (deptCounts[i] > 0) depts[d] = deptCounts[i]; });
        const other = total - deptCounts.reduce((a, b) => a + b, 0);
        if (other > 0) depts["Other / Unassigned"] = other;

        const onLeave = activeLeaves.docs
          .map((d) => d.data())
          .filter((l) => l.status === "Approved" && l.start_date <= todayStr)
          .map((l) => l.employeeName);

        setStats({ totalEmployees: total, newHiresThisMonth: newHires });
        setDepartmentData(depts);
        setPendingLeaves(pendingLv);
        setPendingTimesheets(pendingTs);
        setOnLeaveNames([...new Set(onLeave)]);
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const totalPending = pendingLeaves + pendingTimesheets;

  const quickLaunchItems = [
    { icon: FileText, label: "Leave Requests", path: "/app/leave" },
    { icon: Timer, label: "Timesheets", path: "/app/time" },
    { icon: Users, label: "Employees", path: "/app/employee" },
    { icon: Activity, label: "Performance", path: "/app/performance" },
  ];

  return (
    <div className="p-8 space-y-8 bg-[#f8f9fa] min-h-screen relative">
      {/* Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* === TIME AT WORK (Live Timer) === */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#810100]" />
              <h2 className="text-lg font-bold text-[#1B1717]">Admin Session</h2>
            </div>
            <div className="flex items-center gap-4 mb-4">
              {/* Dynamic Status Icon based on Shift State */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${shiftEnded ? 'bg-gray-50 border-gray-200' : isOvertime ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-100'}`}>
                <CheckCircle className={`w-6 h-6 ${shiftEnded ? 'text-gray-400' : isOvertime ? 'text-orange-500' : 'text-green-600'}`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${shiftEnded ? 'text-gray-500' : isOvertime ? 'text-orange-600' : 'text-green-700'}`}>
                  {shiftEnded ? 'Shift Completed' : isOvertime ? 'Overtime Active' : 'Currently Active'}
                </p>
                <p className="text-xs font-medium text-gray-500">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div className={`py-4 border-t border-gray-100 flex items-baseline gap-2 ${shiftEnded ? 'opacity-60' : ''}`}>
            <span className="text-5xl font-black text-[#1B1717]">
              {sessionTime.h}h {sessionTime.m}m
            </span>
            <span className={`text-xl font-bold ${shiftEnded ? 'text-gray-400' : isOvertime ? 'text-orange-500 animate-pulse' : 'text-[#810100] animate-pulse'}`}>
              {sessionTime.s}s
            </span>
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              <span>Activity Level</span>
              <span className={shiftEnded ? 'text-gray-400' : isOvertime ? 'text-orange-600' : 'text-[#810100]'}>
                {shiftEnded ? 'Offline' : 'Optimal'}
              </span>
            </div>
            <div className="h-16 flex items-end gap-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className={`w-full rounded-t-md transition-colors ${shiftEnded ? 'bg-gray-200' : isOvertime ? 'bg-orange-100 hover:bg-orange-200' : 'bg-[#fce8e8] hover:bg-[#810100]/30'}`} 
                    style={{ height: shiftEnded ? '10%' : `${Math.random() * 60 + 20}%` }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === MY ACTIONS (Live Pending Approvals) === */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-[#810100]" />
            <h2 className="text-lg font-bold text-[#1B1717]">Pending Actions</h2>
          </div>
          
          <div className="flex flex-col h-[70%] justify-center">
            {totalPending === 0 ? (
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 text-[#fce8e8]">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <rect x="20" y="30" width="60" height="50" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path d="M 30,40 L 40,50 L 60,30" stroke="#810100" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">No Pending Actions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLeaves > 0 && (
                  <div onClick={() => navigate('/app/leave')} className="group flex items-center justify-between p-4 bg-yellow-50 rounded-xl border border-yellow-100 cursor-pointer hover:bg-yellow-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg text-yellow-600 shadow-sm"><Calendar className="w-5 h-5"/></div>
                      <div>
                        <p className="font-bold text-yellow-900 leading-tight">Leave Requests</p>
                        <p className="text-xs font-bold text-yellow-700">{pendingLeaves} waiting for approval</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-yellow-600 group-hover:translate-x-1 transition-transform"/>
                  </div>
                )}
                
                {pendingTimesheets > 0 && (
                  <div onClick={() => navigate('/app/time')} className="group flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm"><Timer className="w-5 h-5"/></div>
                      <div>
                        <p className="font-bold text-blue-900 leading-tight">Timesheets</p>
                        <p className="text-xs font-bold text-blue-700">{pendingTimesheets} waiting for approval</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform"/>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* === QUICK LAUNCH === */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-[#810100]" />
            <h2 className="text-lg font-bold text-[#1B1717]">Quick Launch</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {quickLaunchItems.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-[#810100] hover:text-white transition-all group shadow-sm active:scale-95"
              >
                <item.icon className="w-6 h-6 text-[#810100] group-hover:text-white transition-colors" />
                <span className="text-xs font-bold text-gray-700 group-hover:text-white">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Diagrams & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* === EMPLOYEES ON LEAVE TODAY === */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#810100]" />
              <h2 className="text-lg font-bold text-[#1B1717]">On Leave Today</h2>
            </div>
            <span className="bg-[#fce8e8] text-[#810100] px-3 py-1 rounded-full text-xs font-black tracking-widest">{onLeaveNames.length} Away</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[250px] pr-2">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-[#810100] border-t-transparent"></div></div>
            ) : onLeaveNames.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-24 h-24 mb-4 text-green-100">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <circle cx="50" cy="50" r="40" fill="currentColor" />
                    <path d="M 30,50 L 45,65 L 70,35" stroke="green" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Everyone is at work</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {onLeaveNames.map((name, idx) => (
                  <li key={idx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-[#810100] text-white flex items-center justify-center font-bold text-lg shadow-md">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#1B1717] leading-tight">{name}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Approved Leave</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* === DEPARTMENT DISTRIBUTION === */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <PieChart className="w-5 h-5 text-[#810100]" />
            <h2 className="text-lg font-bold text-[#1B1717]">Department Distribution</h2>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-4">
            {Object.keys(departmentData).length === 0 ? (
               <p className="text-center text-gray-500 font-bold text-sm">No department data available</p>
            ) : (
              Object.entries(departmentData).map(([dept, count], idx) => {
                const percentage = Math.round((count / stats.totalEmployees) * 100) || 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-gray-700">{dept}</span>
                      <span className="font-black text-[#810100]">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-[#810100] h-3 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* === OVERVIEW STATISTICS CARDS === */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-[#1B1717] mb-6 border-b border-gray-100 pb-4">Overview Statistics</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#810100] border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-[#fce8e8] border border-[#810100]/10 rounded-2xl">
              <div className="text-5xl font-black text-[#810100] mb-2">{stats.totalEmployees}</div>
              <div className="text-xs font-black uppercase tracking-widest text-[#810100]/80">Total Employees</div>
            </div>
            <div className="text-center p-6 bg-[#fce8e8] border border-[#810100]/10 rounded-2xl">
              <div className="text-5xl font-black text-[#810100] mb-2">{stats.newHiresThisMonth}</div>
              <div className="text-xs font-black uppercase tracking-widest text-[#810100]/80">New Hires (This Month)</div>
            </div>
            <div className="text-center p-6 bg-[#fce8e8] border border-[#810100]/10 rounded-2xl">
              <div className="text-5xl font-black text-[#810100] mb-2">{onLeaveNames.length}</div>
              <div className="text-xs font-black uppercase tracking-widest text-[#810100]/80">On Leave Today</div>
            </div>
            <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-2xl relative overflow-hidden">
              {totalPending > 0 && <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-bl-full animate-pulse"></div>}
              <div className="text-5xl font-black text-yellow-600 mb-2">{totalPending}</div>
              <div className="text-xs font-black uppercase tracking-widest text-yellow-700/80">Pending Approvals</div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================
          OVERTIME MODAL PROMPT
      ========================================= */}
      {showOvertimePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-white animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-[#1B1717] mb-2 uppercase tracking-tight">Shift Complete!</h2>
            <p className="text-gray-600 font-medium mb-8 leading-relaxed">
              You have reached your regular 8-hour shift for today. Are you currently working overtime?
            </p>
            <div className="flex gap-4">
              <button 
                onClick={handleDeclineOvertime}
                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors"
              >
                No, End Shift
              </button>
              <button 
                onClick={handleAcceptOvertime}
                className="flex-1 py-3.5 bg-[#810100] hover:bg-[#630000] text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-red-900/20 transition-all"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}