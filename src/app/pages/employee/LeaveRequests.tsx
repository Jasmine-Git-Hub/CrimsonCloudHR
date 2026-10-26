import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Plus, X, Loader2, CheckCircle, 
  Clock, Eye, Trash2, Info 
} from 'lucide-react';
// import { useNavigate } from 'react-router-dom'; // REMOVED: Unused and causing error
import { auth, db } from '../../../config/firebaseSetup';
import { 
  collection, addDoc, query, where, 
  doc, getDoc, updateDoc, onSnapshot 
} from 'firebase/firestore';
import { LEAVE_TYPES, LEAVE_LIMITS, countWeekdays, leaveYear, balanceId, remaining, pendingDaysFor, validateLeave, type UsedByType } from '../../lib/leavePolicy';
import { manilaDate } from '../../schemas/timesheet';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  dateSubmitted: string;
  employee_id: string;
  employeeName: string;
  remarks?: string;
}

const LeaveRequests: React.FC = () => {
  // const navigate = useNavigate(); // REMOVED: This line was causing the crash
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [userProfile, setUserProfile] = useState({ name: '', employee_id: '' });
  // Approved days per type, by year (from leaveBalances/{employeeId}_{year})
  const [usedByYear, setUsedByYear] = useState<Record<number, UsedByType>>({});
  const thisYear = leaveYear(manilaDate());

  const [formData, setFormData] = useState({
    leave_type: 'Vacation Leave',
    start_date: '',
    end_date: '',
    reason: ''
  });

  // --- 1. AUTO-CALCULATE DAYS (working days only) ---
  const calculatedDays = useMemo(
    () => countWeekdays(formData.start_date, formData.end_date),
    [formData.start_date, formData.end_date],
  );

  // --- 2. FETCH PROFILE & REAL-TIME REQUESTS ---
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Fetch Profile First
    const fetchProfile = async () => {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.username || 'Employee',
          employee_id: data.employeeId || 'TBA',
        });
      }
    };
    fetchProfile();
  }, []);

  // Listen for requests ONLY after employee_id is available
  useEffect(() => {
    if (!userProfile.employee_id || userProfile.employee_id === 'TBA') return;

    // Better Performance: Filter in Firestore using where()
    const q = query(
      collection(db, 'leaveRequests'), 
      where('employee_id', '==', userProfile.employee_id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: LeaveRequest[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as LeaveRequest);
        });
        setRequests(list.sort((a, b) => new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime()));
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile.employee_id]);

  // Balance docs for this year and (when filing ahead) the form's year.
  const formYear = formData.start_date ? leaveYear(formData.start_date) : thisYear;
  useEffect(() => {
    if (!userProfile.employee_id || userProfile.employee_id === 'TBA') return;
    const years = Array.from(new Set([thisYear, formYear]));
    const unsubs = years.map((y) =>
      onSnapshot(doc(db, 'leaveBalances', balanceId(userProfile.employee_id, y)),
        (snap) => setUsedByYear((prev) => ({ ...prev, [y]: (snap.data()?.used as UsedByType) || {} })),
        (err) => console.error('Leave balance:', err)),
    );
    return () => unsubs.forEach((u) => u());
  }, [userProfile.employee_id, thisYear, formYear]);

  // --- 3. BALANCE & STATS ---
  const stats = useMemo(() => {
    const approved = requests.filter(r => r.status === 'Approved');
    const pending = requests.filter(r => r.status === 'Pending');

    const used = usedByYear[thisYear] || {};

    return {
      vlRem: remaining('Vacation Leave', used),
      slRem: remaining('Sick Leave', used),
      totalUsed: approved.filter(r => leaveYear(r.start_date) === thisYear).reduce((sum, r) => sum + r.total_days, 0),
      pendingCount: pending.reduce((sum, r) => sum + r.total_days, 0)
    };
  }, [requests, usedByYear, thisYear]);

  // --- 4. VALIDATIONS ---
  const checkValidation = () => {
    const error = validateLeave(formData, usedByYear[formYear] || {}, pendingDaysFor(requests, formData.leave_type, formYear));
    if (error) return error;

    const isOverlapping = requests.some(r => {
      if (r.status === 'Cancelled' || r.status === 'Rejected') return false;
      const rStart = new Date(r.start_date);
      const rEnd = new Date(r.end_date);
      const fStart = new Date(formData.start_date);
      const fEnd = new Date(formData.end_date);
      return fStart <= rEnd && fEnd >= rStart;
    });
    if (isOverlapping) return "You already have a leave request during these dates.";

    return null;
  };

  // --- 5. ACTIONS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = checkValidation();
    if (error) return alert(error);

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'leaveRequests'), {
        ...formData,
        employee_id: userProfile.employee_id,
        employeeName: userProfile.name,
        total_days: calculatedDays,
        status: 'Pending',
        dateSubmitted: new Date().toISOString().split('T')[0]
      });
      setIsModalOpen(false);
      setFormData({ leave_type: 'Vacation Leave', start_date: '', end_date: '', reason: '' });
    } catch (err) { alert("Failed to submit."); }
    finally { setIsSubmitting(false); }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      await updateDoc(doc(db, 'leaveRequests', id), { status: 'Cancelled' });
    } catch (err) { alert("Failed to cancel."); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = { 
      Approved: "bg-green-50 text-green-700", 
      Rejected: "bg-red-50 text-red-700", 
      Cancelled: "bg-gray-100 text-gray-600", 
      Pending: "bg-yellow-50 text-yellow-700" 
    };
    return <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${styles[status]}`}>{status}</span>;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#810100] w-10 h-10"/></div>;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard label="Vacation Balance" value={stats.vlRem} icon={<Calendar/>} color="bg-blue-600" />
        <BalanceCard label="Sick Balance" value={stats.slRem} icon={<Plus/>} color="bg-green-600" />
        <BalanceCard label="Used Leave" value={stats.totalUsed} icon={<CheckCircle/>} color="bg-gray-700" />
        <BalanceCard label="Pending Days" value={stats.pendingCount} icon={<Clock/>} color="bg-yellow-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-black text-[#1B1717] tracking-tight">Leave History</h2>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#810100] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-bold hover:bg-[#630000] transition-all">
            <Plus className="w-4 h-4"/> Apply for Leave
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#EDEBDD] border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600">Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600">Date Filed</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600">Period</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600 text-center">Days</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No leave requests found.</td></tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-sm">{req.leave_type}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{req.dateSubmitted}</td>
                    <td className="px-6 py-4 text-xs font-medium">{req.start_date} to {req.end_date}</td>
                    <td className="px-6 py-4 font-black text-center text-[#810100]">{req.total_days}</td>
                    <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setSelectedRequest(req); setIsViewModalOpen(true); }} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"><Eye className="w-4 h-4"/></button>
                        {req.status === 'Pending' && (
                          <button onClick={() => handleCancel(req.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-6 bg-[#810100] text-white flex justify-between items-center">
              <h3 className="font-black text-xl tracking-tight">Apply for Leave</h3>
              <button onClick={() => setIsModalOpen(false)}><X/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Leave Type *</label>
                <select className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold focus:border-[#810100] outline-none" value={formData.leave_type} onChange={e => setFormData({...formData, leave_type: e.target.value})}>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t} ({Math.max(remaining(t, usedByYear[formYear] || {}, pendingDaysFor(requests, t, formYear)), 0)} of {LEAVE_LIMITS[t]} left)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">Start Date *</label><input autoComplete="off" type="date" required className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})}/></div>
                <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">End Date *</label><input autoComplete="off" type="date" required className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})}/></div>
              </div>
              <div className="bg-[#fce8e8] p-4 rounded-xl border-2 border-dashed border-[#810100]/20 flex justify-between items-center">
                <span className="text-xs font-black text-[#810100] uppercase">Working Days (Mon–Fri):</span>
                <span className="text-2xl font-black text-[#810100]">{calculatedDays}</span>
              </div>
              <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">Reason *</label><textarea required className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" rows={3} value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Reason for leave..."/></div>
              <button type="submit" disabled={isSubmitting || calculatedDays === 0} className="w-full bg-[#810100] text-white p-4 rounded-xl font-black hover:bg-[#630000] disabled:opacity-50 transition-all shadow-lg active:scale-95">
                {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 space-y-6 relative shadow-2xl">
            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><X/></button>
            <div className="flex items-center gap-3 text-[#810100] border-b-2 border-gray-50 pb-4">
              <Info className="w-6 h-6"/>
              <h3 className="font-black text-2xl tracking-tight">Leave Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-6 text-sm">
              <Detail label="Leave Type" value={selectedRequest.leave_type}/>
              <Detail label="Status" value={selectedRequest.status}/>
              <Detail label="From" value={selectedRequest.start_date}/>
              <Detail label="To" value={selectedRequest.end_date}/>
              <Detail label="Total Days" value={selectedRequest.total_days}/>
              <Detail label="Date Filed" value={selectedRequest.dateSubmitted}/>
              <div className="col-span-2"><Detail label="Reason" value={selectedRequest.reason}/></div>
              {selectedRequest.remarks && (
                <div className="col-span-2 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                  <Detail label="Admin Remarks" value={selectedRequest.remarks}/>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- HELPERS ---
const BalanceCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-5">
    <div className={`p-4 rounded-2xl text-white ${color} shadow-lg shadow-gray-200`}>{icon}</div>
    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p><p className="text-3xl font-black text-[#1B1717]">{value}</p></div>
  </div>
);

const Detail = ({ label, value }: any) => (
  <div className="space-y-1"><p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">{label}</p><p className="font-bold text-[#1B1717]">{value}</p></div>
);

export default LeaveRequests;