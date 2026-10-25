import { Search, Calendar, Filter, Download, Eye, CheckCircle, XCircle, Clock, AlertCircle, X, Info, Loader2, Plus } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { collection, updateDoc, doc, onSnapshot, addDoc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebaseSetup";
import { auth } from "../../config/firebaseSetup";

interface LeaveRequest {
  id?: string;
  employeeName: string;
  employee_id: string; 
  leave_type: string;
  total_days: number;
  start_date: string;
  end_date: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  reason: string;
  dateSubmitted?: string;
  remarks?: string;
}

export default function Leave() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{name: string; employeeId: string} | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedLeaveType, setSelectedLeaveType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Add Request Form States
  const [addFormData, setAddFormData] = useState({
    employeeName: '',
    employee_id: '',
    leave_type: 'Vacation Leave',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const leaveTypes = ["Vacation Leave", "Sick Leave", "Emergency Leave", "Maternity Leave", "Paternity Leave", "Bereavement Leave", "Study Leave"];

  // --- CALCULATE DAYS ---
  const calculatedDays = useMemo(() => {
    if (!addFormData.start_date || !addFormData.end_date) return 0;
    const start = new Date(addFormData.start_date);
    const end = new Date(addFormData.end_date);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : (diffDays === 0 && addFormData.start_date === addFormData.end_date ? 1 : 0);
  }, [addFormData.start_date, addFormData.end_date]);

  // ==============================
  // 🛡️ REAL-TIME DATA FETCHING
  // ==============================
  useEffect(() => {
    setLoading(true);
    
    // Fetch current user profile
    const fetchCurrentUser = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userInfo = {
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
              employeeId: userData.employeeId || ''
            };
            setCurrentUser(userInfo);
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
    
    // LIVE LISTENER para sa Leave Requests (Mula sa Employee Portal)
    const unsubscribe = onSnapshot(collection(db, "leaveRequests"), (snapshot) => {
      const leaveList: LeaveRequest[] = [];
      snapshot.forEach((doc) => {
        leaveList.push({ id: doc.id, ...doc.data() } as LeaveRequest);
      });
      // Sort para ang pinakabago ang nasa taas
      leaveList.sort((a, b) => new Date(b.dateSubmitted || "").getTime() - new Date(a.dateSubmitted || "").getTime());
      setLeaveRequests(leaveList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-populate form when current user is loaded
  useEffect(() => {
    if (currentUser) {
      setAddFormData(prev => ({
        ...prev,
        employeeName: currentUser.name,
        employee_id: currentUser.employeeId
      }));
    }
  }, [currentUser]);

  // ==============================
  // 🛡️ STATUS UPDATE & NOTIFICATION LOGIC
  // ==============================
  const handleUpdateStatus = async () => {
    if (!selectedRequest || !confirmAction) return;

    // VALIDATION: Kung Reject, STRICTLY REQUIRED ang reason
    if (confirmAction === "reject" && !confirmReason.trim()) {
      alert("Kailangan ng remarks o rason kung bakit ire-reject ang leave na ito.");
      return;
    }

    setIsUpdating(true);
    try {
      const requestRef = doc(db, "leaveRequests", selectedRequest.id!);
      const newStatus = confirmAction === "approve" ? "Approved" : "Rejected";
      
      // 1. Update Leave Request Status & Admin Remarks sa Database
      await updateDoc(requestRef, {
        status: newStatus,
        ...(confirmAction === "reject" && { remarks: confirmReason }), 
      });

      // 2. PUSH NOTIFICATION: Ipadala agad sa Notifications inbox ni Employee
      await addDoc(collection(db, "notifications"), {
        title: `Leave Request ${newStatus}`,
        message: confirmAction === "approve"
          ? `Your ${selectedRequest.leave_type} scheduled from ${selectedRequest.start_date} to ${selectedRequest.end_date} has been APPROVED.`
          : `Your ${selectedRequest.leave_type} scheduled from ${selectedRequest.start_date} to ${selectedRequest.end_date} was REJECTED. Reason: ${confirmReason}`,
        type: "System",
        date: new Date().toISOString().split('T')[0],
        isRead: false,
        employeeId: selectedRequest.employee_id 
      });

      // Cleanup
      setShowConfirmModal(false);
      setShowViewModal(false);
      setSelectedRequest(null);
      setConfirmAction(null);
      setConfirmReason("");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to process the request.");
    } finally {
      setIsUpdating(false);
    }
  };

  // ==============================
  // FILTERING LOGIC
  // ==============================
  const filteredRequests = leaveRequests.filter((request) => {
    const matchesSearch = request.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || request.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) || request.leave_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || request.status === selectedStatus;
    const matchesLeaveType = selectedLeaveType === "all" || request.leave_type === selectedLeaveType;
    const matchesDateRange = (!fromDate || request.start_date >= fromDate) && (!toDate || request.end_date <= toDate);

    return matchesSearch && matchesStatus && matchesLeaveType && matchesDateRange;
  });

  const resetFilters = () => { setSearchTerm(""); setSelectedStatus("all"); setSelectedLeaveType("all"); setFromDate(""); setToDate(""); };

  const exportToCSV = () => {
    const headers = ["Employee Name", "Employee ID", "Leave Type", "From Date", "To Date", "Days", "Status", "Reason", "Admin Remarks"];
    const rows = filteredRequests.map(r => [r.employeeName, r.employee_id, r.leave_type, r.start_date, r.end_date, r.total_days.toString(), r.status, `"${r.reason}"`, `"${r.remarks || ""}"`]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `leave_requests.csv`; link.click();
  };

  // ==============================
  // ADD REQUEST SUBMISSION
  // ==============================
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedDays <= 0) return alert("Invalid dates. Please ensure start date is before end date.");
    
    // Add leave type limit validation
    const maxDays: Record<string, number> = {
      'Vacation Leave': 15, 'Sick Leave': 15, 'Emergency Leave': 3,
      'Maternity Leave': 105, 'Paternity Leave': 7, 'Bereavement Leave': 3, 'Study Leave': 30
    };
    if (maxDays[addFormData.leave_type] && calculatedDays > maxDays[addFormData.leave_type]) {
      return alert(`${addFormData.leave_type} cannot exceed ${maxDays[addFormData.leave_type]} days.`);
    }
    
    if (!addFormData.employeeName.trim() || !addFormData.employee_id.trim()) return alert("Employee name and ID are required.");
    if (!addFormData.reason.trim()) return alert("Reason is required.");

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'leaveRequests'), {
        ...addFormData,
        total_days: calculatedDays,
        status: 'Pending',
        dateSubmitted: new Date().toISOString().split('T')[0]
      });
      setShowAddModal(false);
      setAddFormData({ employeeName: '', employee_id: '', leave_type: 'Vacation Leave', start_date: '', end_date: '', reason: '' });
    } catch (error) {
      console.error("Error adding request:", error);
      alert("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config: any = {
      Approved: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
      Pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
      Rejected: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
      Cancelled: { bg: "bg-gray-100", text: "text-gray-700", icon: AlertCircle },
    };
    const Icon = config[status]?.icon || AlertCircle;
    return (
      <span className={`px-3 py-1.5 ${config[status]?.bg} ${config[status]?.text} rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 w-fit tracking-wider`}>
        <Icon className="w-3.5 h-3.5" /> {status}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8 bg-[#F8F9FA] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1B1717] mb-2 tracking-tight">Leave Management</h1>
          <p className="text-gray-500 font-medium">Review and process employee time-off requests</p>
        </div>
        <button onClick={() => { 
          setAddFormData(prev => ({ 
            ...prev, 
            employeeName: currentUser?.name || '', 
            employee_id: currentUser?.employeeId || '' 
          })); 
          setShowAddModal(true); 
        }} className="bg-[#810100] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-bold hover:bg-[#630000] shadow-sm transition-all">
          <Plus className="w-4 h-4"/> Add Request
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Pending Review</h3>
            <div className="bg-yellow-50 text-yellow-600 p-2.5 rounded-xl"><Clock className="w-5 h-5" /></div>
          </div>
          <p className="text-4xl font-black text-[#1B1717]">{leaveRequests.filter((r) => r.status === "Pending").length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Approved</h3>
            <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><CheckCircle className="w-5 h-5" /></div>
          </div>
          <p className="text-4xl font-black text-[#1B1717]">{leaveRequests.filter((r) => r.status === "Approved").length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Leave Days</h3>
            <div className="bg-[#fce8e8] text-[#810100] p-2.5 rounded-xl"><Calendar className="w-5 h-5" /></div>
          </div>
          <p className="text-4xl font-black text-[#1B1717]">{leaveRequests.filter(r => r.status === 'Approved').reduce((acc, r) => acc + r.total_days, 0)}</p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Status</label><select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-100 font-bold rounded-xl outline-none focus:border-[#810100]"><option value="all">All Statuses</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Cancelled">Cancelled</option></select></div>
          <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Leave Type</label><select value={selectedLeaveType} onChange={(e) => setSelectedLeaveType(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-100 font-bold rounded-xl outline-none focus:border-[#810100]"><option value="all">All Types</option>{leaveTypes.map((type) => (<option key={type} value={type}>{type}</option>))}</select></div>
          <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">From Date</label><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-100 font-bold rounded-xl outline-none focus:border-[#810100]"/></div>
          <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">To Date</label><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-100 font-bold rounded-xl outline-none focus:border-[#810100]"/></div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <div className="relative w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-100 font-bold rounded-xl outline-none focus:border-[#810100] text-sm"/>
          </div>
          <div className="flex gap-3">
            <button onClick={resetFilters} className="px-5 py-2.5 border-2 border-gray-100 rounded-xl hover:bg-gray-50 font-bold text-gray-600 transition-colors text-sm">Clear Filters</button>
            <button onClick={exportToCSV} className="flex items-center gap-2 px-5 py-2.5 bg-[#810100] text-white rounded-xl hover:bg-[#630000] font-bold transition-colors text-sm shadow-md"><Download className="w-4 h-4" /> Export Report</button>
          </div>
        </div>
      </div>

      {/* Leave List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-[#810100] mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#EDEBDD] border-b border-gray-200">
                <tr>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Leave Details</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Duration</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black text-gray-600 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#1B1717]">{request.employeeName}</div>
                      <div className="text-xs font-medium text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">{request.employee_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-[#810100] text-sm block">{request.leave_type}</span>
                      <span className="text-xs text-gray-500 truncate max-w-[200px] block mt-0.5" title={request.reason}>{request.reason}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-[#1B1717]">{request.start_date} <span className="text-gray-400 font-medium">to</span> {request.end_date}</div>
                      <div className="text-xs font-black text-gray-500 mt-0.5">{request.total_days} Day(s)</div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={request.status} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setSelectedRequest(request); setShowViewModal(true); }} className="px-4 py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="Review & Decide">
                          Review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">No leave requests found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COMPREHENSIVE REVIEW & DECIDE MODAL */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-[#810100] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5"/>
                <h3 className="font-black text-xl tracking-tight uppercase">Review Leave Request</h3>
              </div>
              <button onClick={() => setShowViewModal(false)} className="hover:rotate-90 transition-transform"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="p-8 space-y-6">
               {/* Employee Quick Info */}
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                 <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Employee</p>
                   <p className="font-black text-lg text-[#1B1717]">{selectedRequest.employeeName}</p>
                   <p className="text-xs text-gray-500 font-bold">{selectedRequest.employee_id}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                   <StatusBadge status={selectedRequest.status} />
                 </div>
               </div>

               {/* Leave Specifics */}
               <div className="grid grid-cols-2 gap-y-6">
                 <div className="col-span-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Leave Category</p>
                    <p className="font-bold text-[#810100] text-lg">{selectedRequest.leave_type}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Duration</p>
                    <p className="font-bold text-[#1B1717]">{selectedRequest.start_date}</p>
                    <p className="font-bold text-[#1B1717]">to {selectedRequest.end_date}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Days Deducted</p>
                    <p className="font-black text-3xl text-[#1B1717]">{selectedRequest.total_days}</p>
                 </div>
                 <div className="col-span-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reason Provided</p>
                    <p className="font-medium text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100">{selectedRequest.reason}</p>
                 </div>
               </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="p-6 bg-gray-50 border-t border-gray-100">
              {selectedRequest.status === "Pending" ? (
                <div className="flex gap-3">
                  <button onClick={() => { setConfirmAction("reject"); setShowConfirmModal(true); }} className="flex-1 py-3 bg-red-100 text-red-700 font-black rounded-xl hover:bg-red-200 transition-colors">
                    Reject Request
                  </button>
                  <button onClick={() => { setConfirmAction("approve"); setShowConfirmModal(true); }} className="flex-1 py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/30 transition-colors">
                    Approve Request
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowViewModal(false)} className="w-full py-3 bg-gray-200 text-gray-700 font-black rounded-xl hover:bg-gray-300">
                  Close Window
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REASON/CONFIRMATION MODAL */}
      {showConfirmModal && selectedRequest && confirmAction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in duration-200">
            <div className={`p-6 text-white flex justify-between items-center ${confirmAction === 'approve' ? 'bg-green-600' : 'bg-red-600'}`}>
              <h3 className="font-black text-xl tracking-tight uppercase">
                {confirmAction === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 font-medium">
                Are you sure you want to <strong>{confirmAction}</strong> the {selectedRequest.leave_type} request of <strong className="text-[#1B1717]">{selectedRequest.employeeName}</strong>?
              </p>
              {confirmAction === "reject" && (
                <div>
                  <label className="block text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Reason for rejection (Required) *</label>
                  <textarea
                    value={confirmReason}
                    onChange={(e) => setConfirmReason(e.target.value)}
                    rows={3}
                    required
                    className="w-full p-4 bg-red-50 border-2 border-red-200 rounded-xl focus:outline-none focus:border-red-500 font-medium text-sm text-red-900 placeholder-red-300"
                    placeholder="Why is this leave not approved?"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-100">
              <button onClick={() => { setShowConfirmModal(false); setConfirmReason(""); }} disabled={isUpdating} className="px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100">Cancel</button>
              <button onClick={handleUpdateStatus} disabled={isUpdating} className={`flex items-center gap-2 px-6 py-3 text-white rounded-xl font-black shadow-lg transition-transform active:scale-95 disabled:opacity-50 ${confirmAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>}
                {isUpdating ? "Processing..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD REQUEST MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 bg-[#810100] text-white flex justify-between items-center">
              <h3 className="font-black text-xl tracking-tight">Add Leave Request</h3>
              <button onClick={() => setShowAddModal(false)} className="hover:rotate-90 transition-transform"><X/></button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Employee Name *</label>
                <input type="text" required readOnly className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold focus:border-[#810100] outline-none bg-gray-50" value={addFormData.employeeName} onChange={e => setAddFormData({...addFormData, employeeName: e.target.value})}/>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Employee ID *</label>
                <input type="text" required readOnly className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold focus:border-[#810100] outline-none bg-gray-50" value={addFormData.employee_id} onChange={e => setAddFormData({...addFormData, employee_id: e.target.value})}/>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Leave Type *</label>
                <select className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold focus:border-[#810100] outline-none" value={addFormData.leave_type} onChange={e => setAddFormData({...addFormData, leave_type: e.target.value})}>
                  {leaveTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">Start Date *</label><input type="date" required className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" value={addFormData.start_date} onChange={e => setAddFormData({...addFormData, start_date: e.target.value})}/></div>
                <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">End Date *</label><input type="date" required className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" value={addFormData.end_date} onChange={e => setAddFormData({...addFormData, end_date: e.target.value})}/></div>
              </div>
              <div className="bg-[#fce8e8] p-4 rounded-xl border-2 border-dashed border-[#810100]/20 flex justify-between items-center">
                <span className="text-xs font-black text-[#810100] uppercase">Calculated Days:</span>
                <span className="text-2xl font-black text-[#810100]">{calculatedDays}</span>
              </div>
              <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">Reason *</label><textarea required className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" rows={3} value={addFormData.reason} onChange={e => setAddFormData({...addFormData, reason: e.target.value})} placeholder="Reason for leave..."/></div>
              <button type="submit" disabled={isSubmitting || calculatedDays === 0} className="w-full bg-[#810100] text-white p-4 rounded-xl font-black hover:bg-[#630000] disabled:opacity-50 transition-all shadow-lg active:scale-95">
                {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}