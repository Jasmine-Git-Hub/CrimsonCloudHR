import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, Loader2, Download } from 'lucide-react';
import { auth } from '../../../config/firebaseSetup';
import { getFirestore, collection, query, where, setDoc, updateDoc, doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { timeInSchema, timeOutSchema, firstIssue, manilaDate, manilaTime, computeHours } from '../../schemas/timesheet';
import { PageSkeleton } from '../../components/PageSkeleton';

const db = getFirestore();

interface Timesheet {
  id: string;
  date: string;
  employeeName: string;
  employeeId: string;
  timeIn?: string;
  timeOut?: string;
  hoursWorked: number;
  overtime: number;
  status: string;
}

const Attendance: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [userData, setUserData] = useState({ name: '', employeeId: '' });
  const [history, setHistory] = useState<Timesheet[]>([]);
  const [todayRecord, setTodayRecord] = useState<Timesheet | null>(null);

  // States for Time Capturing
  const [timeIn, setTimeIn] = useState<string>('');
  const [timeOut, setTimeOut] = useState<string>('');

  // States for Filtering
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    status: ''
  });

  // Live Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ==============================
  // 🛡️ REAL-TIME DATA FETCHING
  // ==============================
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    let unsubscribeTs: () => void;

    const setupLiveListener = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let empName = 'Employee';
        let empId = 'TBA';

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          empName = data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : (data.username || 'Employee');
          empId = data.employeeId || 'TBA';
          setUserData({ name: empName, employeeId: empId });
        }

        if (empId !== 'TBA') {
          const tsQuery = query(collection(db, 'timesheets'), where('employeeId', '==', empId));
          
          unsubscribeTs = onSnapshot(tsQuery, (snapshot) => {
            const tsList: Timesheet[] = [];
            snapshot.forEach((doc) => {
              tsList.push({ id: doc.id, ...doc.data() } as Timesheet);
            });

            tsList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setHistory(tsList);

            const todayStr = manilaDate();
            const todayTs = tsList.find(ts => ts.date === todayStr);
            setTodayRecord(todayTs || null);

            if (todayTs) {
              setTimeIn(todayTs.timeIn || '');
              setTimeOut(todayTs.timeOut || '');
            }
            setLoading(false);
          }, (error) => {
            console.error("Timesheet listener error:", error);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setLoading(false);
      }
    };

    setupLiveListener();

    return () => {
      if (unsubscribeTs) unsubscribeTs();
    };
  }, []);

  // ==============================
  // TIME CAPTURE LOGIC
  // ==============================
  const getCurrentFormattedTime = () => manilaTime();

  const handleCaptureTimeIn = () => {
    if (todayRecord) return alert("Nakapag Time In ka na para sa araw na ito!");
    setTimeIn(getCurrentFormattedTime());
  };

  const handleCaptureTimeOut = () => {
    if (!timeIn) return alert("Kailangan mo munang mag-Time In!");
    if (todayRecord?.timeOut) return alert("Nakapag Time Out ka na para sa araw na ito!");
    setTimeOut(getCurrentFormattedTime());
  };

  // ==============================
  // TIME CALCULATION LOGIC
  // ==============================
  // Shared with Time.tsx approvals and mirrored in firestore.rules.
  const calculateHours = computeHours;

  const currentCalc = calculateHours(timeIn, timeOut);

  // ==============================
  // SAVE RECORD (FIREBASE)
  // ==============================
  const handleSaveRecord = async () => {
    // Validate BEFORE writing. firestore.rules re-checks the same constraints
    // server-side, and stamps timeInAt/timeOutAt with the server clock.
    // The clock is read at SAVE time (Manila time); firestore.rules rejects any
    // time more than 5 minutes away from the server clock.
    if (!todayRecord) {
      if (!timeIn) return alert("Kailangan mong i-capture ang Time In bago mag-save.");
      const now = manilaTime();
      const parsed = timeInSchema.safeParse({ employeeId: userData.employeeId, date: manilaDate(), timeIn: now });
      if (!parsed.success) return alert(firstIssue(parsed.error));

      setActionLoading(true);
      try {
        setTimeIn(now);
        // One record per employee per day: the ID is fixed, rules forbid a second create.
        await setDoc(doc(db, 'timesheets', `${parsed.data.employeeId}_${parsed.data.date}`), {
          employeeId: parsed.data.employeeId,
          employeeName: userData.name,
          date: parsed.data.date,
          timeIn: parsed.data.timeIn,
          timeInAt: serverTimestamp(),
          timeOut: "",
          hoursWorked: 0,
          overtime: 0,
          status: "Submitted"
        });
      } catch (error) {
        console.error("Error saving timesheet:", error);
        alert("Hindi makapag-save. Subukan muli.");
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (!timeOut) return alert("Kailangan mong i-capture ang Time Out.");
    const parsed = timeOutSchema.safeParse({ timeIn: todayRecord.timeIn, timeOut: manilaTime() });
    if (!parsed.success) return alert(firstIssue(parsed.error));

    setActionLoading(true);
    try {
      setTimeOut(parsed.data.timeOut);
      const { regular, overtime } = calculateHours(parsed.data.timeIn, parsed.data.timeOut);
      await updateDoc(doc(db, 'timesheets', todayRecord.id), {
        timeOut: parsed.data.timeOut,
        timeOutAt: serverTimestamp(),
        hoursWorked: regular,
        overtime: overtime
      });
    } catch (error) {
      console.error("Error saving timesheet:", error);
      alert("Hindi makapag-save. Subukan muli.");
    } finally {
      setActionLoading(false);
    }
  };

  // ==============================
  // FILTERING & EXPORT LOGIC
  // ==============================
  const filteredHistory = history.filter((ts) => {
    const matchesFrom = !filters.fromDate || ts.date >= filters.fromDate;
    const matchesTo = !filters.toDate || ts.date <= filters.toDate;
    const matchesStatus = !filters.status || ts.status === filters.status;
    return matchesFrom && matchesTo && matchesStatus;
  });

  const clearFilters = () => {
    setFilters({ fromDate: '', toDate: '', status: '' });
  };

  const exportReport = () => {
    if (filteredHistory.length === 0) {
      alert("Walang records na i-e-export based sa filters mo.");
      return;
    }

    const headers = ["Date", "Time In", "Time Out", "Regular Hours", "Overtime", "Status"];
    const rows = filteredHistory.map(ts => [
      ts.date,
      ts.timeIn || 'N/A',
      ts.timeOut || 'N/A',
      Number(ts.hoursWorked || 0).toFixed(2),
      Number(ts.overtime || 0).toFixed(2),
      ts.status
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `My_Attendance_${userData.employeeId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved": return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest">Approved</span>;
      case "Rejected": return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest">Rejected</span>;
      default: return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black uppercase tracking-widest">Pending</span>;
    }
  };

  const todayHrs = Number(todayRecord?.hoursWorked || 0);
  const todayOT = Number(todayRecord?.overtime || 0);
  const weeklyHrs = history.slice(0, 7).reduce((total, ts) => total + Number(ts.hoursWorked || 0), 0);

  if (loading) {
    return <PageSkeleton cards={3} rows={6} />;
  }

  const isShiftCompleted = todayRecord?.timeIn && todayRecord?.timeOut;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#1B1717] uppercase tracking-tight mb-1">Attendance</h1>
        <p className="text-gray-500 font-medium text-sm">Clock in to record your attendance and view your history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* === CLOCK IN/OUT CAPTURE CARD === */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-lg font-black text-[#1B1717]">Time Entry</h2>
              <span className="text-xs font-black uppercase tracking-widest text-[#810100] bg-[#fce8e8] px-3 py-1 rounded-full">
                {currentTime.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* TIME IN SECTION */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Time In *</label>
                <div className="space-y-2">
                  <div className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center font-bold text-lg">
                    {timeIn || "--:--"}
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureTimeIn}
                    disabled={!!todayRecord || actionLoading}
                    className="w-full py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 text-sm font-bold shadow-md active:scale-95"
                  >
                    Capture Time In
                  </button>
                </div>
              </div>

              {/* TIME OUT SECTION */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Time Out *</label>
                <div className="space-y-2">
                  <div className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center font-bold text-lg">
                    {timeOut || "--:--"}
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureTimeOut}
                    disabled={!todayRecord || isShiftCompleted || actionLoading}
                    className="w-full py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 text-sm font-bold shadow-md active:scale-95"
                  >
                    Capture Time Out
                  </button>
                </div>
              </div>
            </div>

            {/* LIVE CALCULATION PREVIEW */}
            <div className="bg-[#fce8e8] p-5 rounded-xl mt-6 border-2 border-dashed border-[#810100]/20">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#810100] mb-3 flex items-center gap-2"><Clock className="w-4 h-4"/> Computed Hours</h4>
              <div className="flex justify-between text-sm text-[#1B1717]">
                <span className="font-medium">Regular: <strong className="text-lg">{currentCalc.regular.toFixed(2)}</strong></span>
                <span className="font-medium">Overtime: <strong className="text-lg text-[#810100]">{currentCalc.overtime.toFixed(2)}</strong></span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {isShiftCompleted ? (
              <div className="bg-green-50 border-2 border-green-100 text-green-700 p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 uppercase tracking-widest">
                <CheckCircle className="w-5 h-5" /> Shift Completed
              </div>
            ) : (
              <button 
                onClick={handleSaveRecord}
                disabled={actionLoading || (!timeIn && !timeOut)}
                className="w-full py-4 bg-[#810100] hover:bg-[#630000] text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg active:scale-95 uppercase tracking-widest"
              >
                {actionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                Save Record
              </button>
            )}
          </div>
        </div>

        {/* === DAILY SUMMARY CARDS === */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col justify-center relative overflow-hidden">
            <Clock className="absolute -right-4 -bottom-4 w-32 h-32 text-gray-50 opacity-50" />
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
              Hours Today
            </h3>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-5xl font-black text-[#1B1717]">{todayHrs > 0 ? todayHrs.toFixed(2) : '0'}</span>
              <span className="text-gray-500 font-bold">hrs</span>
            </div>
            <p className="text-sm text-[#810100] mt-2 font-bold relative z-10">+{todayOT > 0 ? todayOT.toFixed(2) : '0'} hrs overtime</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col justify-center relative overflow-hidden">
            <Calendar className="absolute -right-4 -bottom-4 w-32 h-32 text-gray-50 opacity-50" />
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
              This Week
            </h3>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-5xl font-black text-[#1B1717]">{weeklyHrs > 0 ? weeklyHrs.toFixed(2) : '0'}</span>
              <span className="text-gray-500 font-bold">hrs</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest relative z-10">Total regular hours</p>
          </div>
        </div>
      </div>

      {/* === ATTENDANCE HISTORY TABLE WITH FILTERS & EXPORT === */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-lg font-black uppercase tracking-tight text-[#1B1717]">Attendance History</h2>
        </div>
        
        {/* FILTER CONTROLS */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">From Date</label>
              <input autoComplete="off" type="date" value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value})} className="w-full px-4 py-2 border-2 border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-[#810100]"/>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">To Date</label>
              <input autoComplete="off" type="date" value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value})} className="w-full px-4 py-2 border-2 border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-[#810100]"/>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</label>
              <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full px-4 py-2 border-2 border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-[#810100]">
                <option value="">All</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending / Submitted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
             <button onClick={clearFilters} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Clear Filters</button>
             <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#810100] hover:bg-[#630000] rounded-xl shadow-md transition-colors"><Download className="w-4 h-4"/> Export Report</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#EDEBDD] border-b border-gray-200">
              <tr>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Date</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Time In</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Time Out</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Reg. Hrs</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">OT Hrs</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHistory.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">No attendance records found.</td></tr>
              ) : (
                filteredHistory.map((ts) => (
                  <tr key={ts.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1B1717]">{ts.date}</td>
                    <td className="px-6 py-4 font-bold text-green-700">{ts.timeIn || '--:--'}</td>
                    <td className="px-6 py-4 font-bold text-red-700">{ts.timeOut || '--:--'}</td>
                    <td className="px-6 py-4 font-black text-lg text-[#1B1717]">{Number(ts.hoursWorked || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 font-black text-lg text-[#810100]">{Number(ts.overtime || 0) > 0 ? Number(ts.overtime).toFixed(2) : '-'}</td>
                    <td className="px-6 py-4">{getStatusBadge(ts.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Attendance;