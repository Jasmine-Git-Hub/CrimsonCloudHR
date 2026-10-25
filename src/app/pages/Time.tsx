import { Download, Check, X, Clock, Loader2, Eye, Calendar, FileText, Plus, Play, Square, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, onSnapshot, query, addDoc, where } from "firebase/firestore";
import { db } from "../../config/firebaseSetup";
import { computeHours } from "../schemas/timesheet";
import Attendance from "./time/Attendance";
import Reports from "./time/Reports";

interface Timesheet {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  timeIn: string;
  timeOut: string;
  hoursWorked: number;
  overtime: number;
  status: string;
  hasCorrectionRequest?: boolean;
  correctionRequestId?: string;
  correctionDetails?: any;
}

interface HRRequest {
  id: string;
  request_type: string;
  employee_id: string;
  employee_name: string;
  date_effective?: string;
  date_submitted: string;
  details?: any;
  reason: string;
  status: string;
}

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  subUnit?: string;
}

export default function Time() {
  const [activeTab, setActiveTab] = useState("time");
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<HRRequest | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    employee: "",
    subUnit: "",
    status: ""
  });

  useEffect(() => {
    setLoading(true);
    
    const fetchEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const empList: Employee[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          empList.push({
            id: doc.id,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            employeeId: data.employeeId || '',
            subUnit: data.subUnit || ''
          });
        });
        setEmployees(empList);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();

    const timesheetsQuery = query(collection(db, "timesheets"));
    const unsubscribeTimesheets = onSnapshot(timesheetsQuery, (snapshot) => {
      const tsList: Timesheet[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tsList.push({
          id: doc.id,
          date: data.date,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          timeIn: data.timeIn,
          timeOut: data.timeOut,
          hoursWorked: data.hoursWorked,
          overtime: data.overtime,
          status: data.status
        });
      });
      tsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimesheets(tsList);
    });

    const requestsQuery = query(collection(db, "requests"));
    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const reqList: HRRequest[] = [];
      snapshot.forEach((doc) => {
        reqList.push({ id: doc.id, ...doc.data() });
      });
      setRequests(reqList);
      setLoading(false);
    });

    return () => {
      unsubscribeTimesheets();
      unsubscribeRequests();
    };
  }, []);

  const filteredTimesheets = timesheets.filter((ts) => {
    if (filters.fromDate && ts.date < filters.fromDate) return false;
    if (filters.toDate && ts.date > filters.toDate) return false;
    if (filters.employee && !ts.employeeName.toLowerCase().includes(filters.employee.toLowerCase()) && !ts.employeeId.toLowerCase().includes(filters.employee.toLowerCase())) return false;
    if (filters.subUnit) {
      const emp = employees.find(e => e.employeeId === ts.employeeId);
      if (emp?.subUnit !== filters.subUnit) return false;
    }
    if (filters.status && ts.status !== filters.status) return false;
    return true;
  });

  const totalHours = filteredTimesheets.reduce((sum, ts) => sum + ts.hoursWorked, 0);
  const totalOvertime = filteredTimesheets.reduce((sum, ts) => sum + ts.overtime, 0);
  const pendingCount = filteredTimesheets.filter(ts => ts.status === "Submitted").length;

  const pendingCorrections = requests.filter(req => req.request_type === "Attendance Correction" && req.status === "Pending").length;
  const pendingOvertimeOther = requests.filter(req => req.request_type !== "Attendance Correction" && req.status === "Pending").length;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      employee: "",
      subUnit: "",
      status: ""
    });
  };

  const handleApproveAttendanceCorrection = async (request: HRRequest) => {
    setUpdating(request.id);
    try {
      await updateDoc(doc(db, "requests", request.id), {
        status: "Approved"
      });

      // Recompute paid hours from the corrected times — otherwise payroll
      // would keep paying the old hoursWorked.
      const { regular, overtime } = computeHours(request.details?.time_in, request.details?.time_out);
      const timesheetRef = doc(db, "timesheets", request.details?.timesheetId);
      await updateDoc(timesheetRef, {
        timeIn: request.details?.time_in,
        timeOut: request.details?.time_out,
        hoursWorked: regular,
        overtime,
        status: "Approved"
      });

      alert("Attendance correction approved successfully!");
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request.");
    } finally {
      setUpdating(null);
    }
  };

  const handleRejectAttendanceCorrection = async (request: HRRequest) => {
    setUpdating(request.id);
    try {
      await updateDoc(doc(db, "requests", request.id), {
        status: "Rejected"
      });
      alert("Attendance correction rejected.");
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request.");
    } finally {
      setUpdating(null);
    }
  };

  const handleApproveRequest = async (request: HRRequest) => {
    setUpdating(request.id);
    try {
      await updateDoc(doc(db, "requests", request.id), {
        status: "Approved"
      });
      alert("Request approved successfully!");
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request.");
    } finally {
      setUpdating(null);
    }
  };

  const handleRejectRequest = async (request: HRRequest) => {
    setUpdating(request.id);
    try {
      await updateDoc(doc(db, "requests", request.id), {
        status: "Rejected"
      });
      alert("Request rejected.");
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request.");
    } finally {
      setUpdating(null);
    }
  };

  const handleTimesheetStatusUpdate = async (timesheet: Timesheet, newStatus: "Approved" | "Rejected") => {
    setUpdating(timesheet.id);
    try {
      await updateDoc(doc(db, "timesheets", timesheet.id), {
        status: newStatus
      });
      alert(`Timesheet ${newStatus.toLowerCase()} successfully!`);
    } catch (error) {
      console.error("Error updating timesheet:", error);
      alert("Failed to update timesheet.");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved": return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider">Approved</span>;
      case "Rejected": return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider">Rejected</span>;
      default: return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black uppercase tracking-wider">Pending</span>;
    }
  };

  const downloadReport = () => {
    const headers = ["Date", "Employee", "Employee ID", "Time In", "Time Out", "Hours Worked", "Overtime", "Status"];
    const rows = filteredTimesheets.map((ts) => [
      ts.date, ts.employeeName, ts.employeeId, ts.timeIn || "N/A", ts.timeOut || "N/A", ts.hoursWorked.toString(), ts.overtime.toString(), ts.status
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `timesheet-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
  };

  return (
    <div className="p-8 space-y-8 bg-[#F8F9FA] min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1B1717] mb-2 tracking-tight">Time Management</h1>
          <p className="text-gray-500 font-medium">Manage attendance, approve timesheets, and export reports</p>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100 px-4">
          <button
            onClick={() => setActiveTab('time')}
            className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${
              activeTab === 'time' ? 'text-[#810100] border-[#810100]' : 'text-gray-500 border-transparent hover:text-gray-800'
            }`}
          >
            Timesheets{' '}
            {pendingCorrections > 0 && (
              <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                {pendingCorrections}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${
              activeTab === 'requests' ? 'text-[#810100] border-[#810100]' : 'text-gray-500 border-transparent hover:text-gray-800'
            }`}
          >
            Other Requests{' '}
            {pendingOvertimeOther > 0 && (
              <span className="ml-2 bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs">
                {pendingOvertimeOther}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${
              activeTab === 'attendance' ? 'text-[#810100] border-[#810100]' : 'text-gray-500 border-transparent hover:text-gray-800'
            }`}
          >
            Live Attendance
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${
              activeTab === 'reports' ? 'text-[#810100] border-[#810100]' : 'text-gray-500 border-transparent hover:text-gray-800'
            }`}
          >
            Time Reports
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="p-6">
          {activeTab === 'time' && (
            <div className="space-y-8">
              {/* COMPUTED STATS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                    <Clock className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Regular Hours</p>
                    <p className="text-4xl font-black text-[#1B1717]">{totalHours.toFixed(1)} <span className="text-sm font-bold text-gray-400">hrs</span></p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
                  <Clock className="w-6 h-6 text-[#810100]" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Overtime</p>
                    <p className="text-4xl font-black text-[#810100]">{totalOvertime.toFixed(1)} <span className="text-sm font-bold text-[#810100]/60">hrs</span></p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
                  <FileText className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Approvals</p>
                    <p className="text-4xl font-black text-[#1B1717]">{pendingCount}</p>
                  </div>
                </div>
              </div>

              {/* MAIN CONTENT */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-black text-[#1B1717] mb-6">Filter Records</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">From Date</label><input type="date" name="fromDate" value={filters.fromDate} onChange={handleChange} className="w-full px-4 py-2.5 border-2 border-gray-100 font-bold rounded-xl focus:border-[#810100] outline-none" /></div>
                    <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">To Date</label><input type="date" name="toDate" value={filters.toDate} onChange={handleChange} className="w-full px-4 py-2.5 border-2 border-gray-100 font-bold rounded-xl focus:border-[#810100] outline-none" /></div>
                    <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Employee</label><input type="text" name="employee" placeholder="Name or ID" value={filters.employee} onChange={handleChange} className="w-full px-4 py-2.5 border-2 border-gray-100 font-bold rounded-xl focus:border-[#810100] outline-none" /></div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Sub Unit</label>
                      <select name="subUnit" value={filters.subUnit} onChange={handleChange} className="w-full px-4 py-2.5 border-2 border-gray-100 font-bold rounded-xl focus:border-[#810100] outline-none">
                        <option value="">All</option>
                        {Array.from(new Set(employees.map(e => e.subUnit).filter(Boolean))).map(unit => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</label>
                      <select name="status" value={filters.status} onChange={handleChange} className="w-full px-4 py-2.5 border-2 border-gray-100 font-bold rounded-xl focus:border-[#810100] outline-none">
                        <option value="">All</option>
                        <option value="Submitted">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button onClick={resetFilters} className="px-5 py-2.5 border-2 border-gray-100 rounded-xl hover:bg-gray-50 text-gray-700 font-bold transition-colors text-sm">Clear Filters</button>
                    <button onClick={downloadReport} className="flex items-center gap-2 px-5 py-2.5 bg-[#810100] text-white rounded-xl hover:bg-[#630000] font-bold shadow-md transition-colors text-sm">
                      <Download className="w-4 h-4" /> Export Report
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-[#810100] mx-auto" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#EDEBDD] border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Employee</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Time Logs</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Reg. Hrs</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">OT Hrs</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-5 text-center text-[10px] font-black text-gray-600 uppercase tracking-widest">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTimesheets.length === 0 ? (
                          <tr><td colSpan={7} className="px-6 py-16 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">No time records found</td></tr>
                        ) : (
                          filteredTimesheets.map((ts) => (
                            <tr key={ts.id} className={`hover:bg-gray-50 transition-colors group ${ts.hasCorrectionRequest ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''}`}>
                              <td className="px-6 py-4 font-bold text-[#1B1717]">{ts.date}</td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-[#1B1717]">{ts.employeeName}</div>
                                <div className="text-xs font-medium text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">{ts.employeeId}</div>
                              </td>
                              <td className="px-6 py-4">
                                {ts.hasCorrectionRequest && (
                                  <div className="mb-2 flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3 text-yellow-600" />
                                    <span className="text-[10px] font-black text-yellow-600 uppercase">Correction Requested</span>
                                  </div>
                                )}
                                {ts.timeIn && ts.timeOut ? (
                                  <div>
                                    <div className="text-sm font-bold text-gray-600">
                                      <span className="text-green-600">{ts.timeIn}</span> <span className="text-gray-300 mx-1">to</span> <span className="text-red-600">{ts.timeOut}</span>
                                    </div>
                                    {ts.hasCorrectionRequest && ts.correctionDetails && (
                                      <div className="mt-2 text-xs text-gray-500 border-t border-yellow-200 pt-1">
                                        <span className="font-bold">Requested:</span> {ts.correctionDetails.timeIn} → {ts.correctionDetails.timeOut}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-1 rounded">Incomplete Log</span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-black text-lg text-[#1B1717]">{ts.hoursWorked}</td>
                              <td className="px-6 py-4 font-black text-lg text-[#810100]">{ts.overtime > 0 ? ts.overtime : '-'}</td>
                              <td className="px-6 py-4">{getStatusBadge(ts.status)}</td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                  {ts.hasCorrectionRequest && ts.correctionRequestId ? (
                                    <>
                                      <button 
                                        onClick={() => {
                                          const correctionRequest = requests.find(r => r.id === ts.correctionRequestId);
                                          if (correctionRequest) {
                                            setSelectedRequest(correctionRequest);
                                            setShowRequestsModal(true);
                                          }
                                        }} 
                                        className="p-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-600 hover:text-white transition-colors" 
                                        title="Review Correction Request"
                                      >
                                        <RefreshCw className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const correctionRequest = requests.find(r => r.id === ts.correctionRequestId);
                                          if (correctionRequest) {
                                            handleApproveAttendanceCorrection(correctionRequest);
                                          }
                                        }} 
                                        disabled={updating === ts.correctionRequestId} 
                                        className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50" 
                                        title="Approve Correction"
                                      >
                                        {updating === ts.correctionRequestId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const correctionRequest = requests.find(r => r.id === ts.correctionRequestId);
                                          if (correctionRequest) {
                                            handleRejectAttendanceCorrection(correctionRequest);
                                          }
                                        }} 
                                        disabled={updating === ts.correctionRequestId} 
                                        className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50" 
                                        title="Reject Correction"
                                      >
                                        {updating === ts.correctionRequestId ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={() => { setSelectedTimesheet(ts); setShowViewModal(true); }} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="Review">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      {ts.status === "Submitted" && (
                                        <>
                                          <button onClick={() => handleTimesheetStatusUpdate(ts, "Approved")} disabled={updating === ts.id} className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50" title="Approve">
                                            {updating === ts.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                          </button>
                                          <button onClick={() => handleTimesheetStatusUpdate(ts, "Rejected")} disabled={updating === ts.id} className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50" title="Reject">
                                            {updating === ts.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "requests" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#1B1717]">Overtime & Other Requests</h2>
                  <p className="text-sm text-gray-500">Review and approve overtime and other HR requests</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#EDEBDD] border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Employee</th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Effective Date</th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Details</th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-5 text-center text-[10px] font-black text-gray-600 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {requests.filter(req => req.request_type !== "Attendance Correction").length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">No requests found</td></tr>
                      ) : (
                        requests.filter(req => req.request_type !== "Attendance Correction").map((req) => (
                          <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                req.request_type === 'Overtime' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {req.request_type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-[#1B1717]">{req.employee_name}</div>
                              <div className="text-xs font-medium text-gray-500">{req.employee_id}</div>
                            </td>
                            <td className="px-6 py-4 font-bold">{req.date_effective || 'N/A'}</td>
                            <td className="px-6 py-4">
                              {req.request_type === 'Overtime' && (
                                <span className="font-bold text-[#810100]">{req.details?.hours} hrs</span>
                              )}
                              {req.request_type === 'Other' && (
                                <span className="text-gray-600">{req.details?.subject}</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                req.status === 'Cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                              }`}>{req.status}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center gap-2">
                                {req.status === "Pending" && (
                                  <>
                                    <button onClick={() => handleApproveRequest(req)} disabled={updating === req.id} className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50" title="Approve">
                                      {updating === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => handleRejectRequest(req)} disabled={updating === req.id} className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50" title="Reject">
                                      {updating === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                    </button>
                                  </>
                                )}
                                <button onClick={() => { setSelectedRequest(req); setShowRequestsModal(true); }} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "attendance" && <Attendance />}
          {activeTab === "reports" && <Reports />}
        </div>
      </div>

      {/* TIMESHEET VIEW MODAL */}
      {showViewModal && selectedTimesheet && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 bg-[#810100] text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">Timesheet Review</h3>
              <button onClick={() => setShowViewModal(false)} className="hover:rotate-90 transition-transform"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Employee</p>
                <p className="font-black text-lg text-[#1B1717]">{selectedTimesheet.employeeName}</p>
                <p className="text-xs text-gray-500 font-bold mb-4">{selectedTimesheet.employeeId}</p>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date</p>
                    <p className="font-bold text-[#1B1717]">{selectedTimesheet.date}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    {getStatusBadge(selectedTimesheet.status)}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Time In</p>
                    <p className="font-bold text-green-700">{selectedTimesheet.timeIn || "No Record"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Time Out</p>
                    <p className="font-bold text-red-700">{selectedTimesheet.timeOut || "No Record"}</p>
                  </div>
                  <div className="col-span-2 flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 mt-2">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Regular</p>
                      <p className="font-black text-xl text-[#1B1717]">{selectedTimesheet.hoursWorked} <span className="text-xs">hrs</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-[#810100]/60 uppercase">Overtime</p>
                      <p className="font-black text-xl text-[#810100]">{selectedTimesheet.overtime} <span className="text-xs">hrs</span></p>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedTimesheet.status === "Submitted" && (
                <div className="flex gap-3">
                  <button onClick={() => handleTimesheetStatusUpdate(selectedTimesheet, "Rejected")} disabled={updating === selectedTimesheet.id} className="flex-1 py-3 bg-red-100 text-red-700 font-black rounded-xl hover:bg-red-200 transition-colors">
                    Reject
                  </button>
                  <button onClick={() => handleTimesheetStatusUpdate(selectedTimesheet, "Approved")} disabled={updating === selectedTimesheet.id} className="flex-1 flex justify-center items-center gap-2 py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/30 transition-colors">
                    {updating === selectedTimesheet.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Approve"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REQUEST VIEW MODAL (for attendance corrections shown in timesheet section) */}
      {showRequestsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 bg-[#810100] text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">
                {selectedRequest.request_type === "Attendance Correction" ? "Attendance Correction Request" : "Request Details"}
              </h3>
              <button onClick={() => { setShowRequestsModal(false); setSelectedRequest(null); }} className="hover:rotate-90 transition-transform"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Employee</p>
                    <p className="font-bold text-[#1B1717]">{selectedRequest.employee_name}</p>
                    <p className="text-xs text-gray-500 font-bold">{selectedRequest.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Request Type</p>
                    <p className="font-bold text-[#1B1717]">{selectedRequest.request_type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Effective Date</p>
                    <p className="font-bold text-[#1B1717]">{selectedRequest.date_effective || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date Submitted</p>
                    <p className="font-bold text-[#1B1717]">{selectedRequest.date_submitted}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-700' :
                      selectedRequest.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      selectedRequest.status === 'Cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                    }`}>{selectedRequest.status}</span>
                  </div>
                </div>
              </div>

              {selectedRequest.request_type === 'Attendance Correction' && (
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Corrected Time</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Time In</p>
                      <p className="font-bold text-green-700 text-lg">{selectedRequest.details?.time_in || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Time Out</p>
                      <p className="font-bold text-red-700 text-lg">{selectedRequest.details?.time_out || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRequest.request_type === 'Overtime' && (
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Requested Overtime Hours</p>
                  <p className="font-black text-3xl text-[#810100]">{selectedRequest.details?.hours} hrs</p>
                </div>
              )}

              {selectedRequest.request_type === 'Other' && (
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subject</p>
                  <p className="font-bold text-[#1B1717]">{selectedRequest.details?.subject}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reason / Description</p>
                <p className="text-gray-700 leading-relaxed">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.status === "Pending" && (
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      if (selectedRequest.request_type === "Attendance Correction") {
                        handleRejectAttendanceCorrection(selectedRequest);
                      } else {
                        handleRejectRequest(selectedRequest);
                      }
                    }} 
                    disabled={updating === selectedRequest.id} 
                    className="flex-1 py-3 bg-red-100 text-red-700 font-black rounded-xl hover:bg-red-200 transition-colors"
                  >
                    Reject Request
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedRequest.request_type === "Attendance Correction") {
                        handleApproveAttendanceCorrection(selectedRequest);
                      } else {
                        handleApproveRequest(selectedRequest);
                      }
                    }} 
                    disabled={updating === selectedRequest.id} 
                    className="flex-1 flex justify-center items-center gap-2 py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/30 transition-colors"
                  >
                    {updating === selectedRequest.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Approve Request"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}