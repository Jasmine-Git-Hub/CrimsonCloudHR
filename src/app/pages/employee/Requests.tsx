import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, X, Loader2, CheckCircle, 
  Clock, AlertCircle, Eye, Trash2, Info, Send
} from 'lucide-react';
import { auth, db } from '../../../config/firebaseSetup';
import { 
  collection, addDoc, query, where, getDoc, 
  doc, updateDoc, onSnapshot 
} from 'firebase/firestore';

interface HRRequest {
  id: string;
  request_type: 'Overtime' | 'Attendance Correction' | 'Other';
  date_effective: string;
  details: {
    hours?: string;
    time_in?: string;
    time_out?: string;
    subject?: string;
  };
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  date_submitted: string;
  employee_id: string;
  employee_name: string;
}

const Requests: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [userProfile, setUserProfile] = useState({ name: '', employee_id: '' });
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HRRequest | null>(null);

  const [formData, setFormData] = useState({
    request_type: 'Overtime' as HRRequest['request_type'],
    date_effective: '',
    hours: '',
    time_in: '',
    time_out: '',
    subject: '',
    reason: ''
  });

  // --- FETCH USER & REQUESTS ---
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const fetchAndListen = async () => {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const empId = data.employeeId || 'TBA';
        setUserProfile({
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.username || 'Employee',
          employee_id: empId
        });

        const q = query(collection(db, 'requests'), where('employee_id', '==', empId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list: HRRequest[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as HRRequest);
          });
          setRequests(list.sort((a, b) => new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime()));
          setLoading(false);
        });
        return unsubscribe;
      }
    };
    fetchAndListen();
  }, []);

  // --- SUBMIT REQUEST (ONLY CREATE REQUEST, NO TIMESHEET UPDATE) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const requestData = {
        request_type: formData.request_type,
        date_effective: formData.date_effective,
        reason: formData.reason,
        employee_id: userProfile.employee_id,
        employee_name: userProfile.name,
        status: 'Pending',
        date_submitted: new Date().toISOString().split('T')[0],
        details: {} as any
      };

      // Clean up details based on type
      if (formData.request_type === 'Overtime') {
        requestData.details.hours = formData.hours;
      }
      if (formData.request_type === 'Attendance Correction') {
        requestData.details.time_in = formData.time_in;
        requestData.details.time_out = formData.time_out;
      }
      if (formData.request_type === 'Other') {
        requestData.details.subject = formData.subject;
      }

      await addDoc(collection(db, 'requests'), requestData);
      setIsModalOpen(false);
      setFormData({ 
        request_type: 'Overtime', 
        date_effective: '', 
        hours: '', 
        time_in: '', 
        time_out: '', 
        subject: '', 
        reason: '' 
      });
      alert("Request submitted successfully! Waiting for HR approval.");
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm("Cancel this request?")) {
      try {
        await updateDoc(doc(db, 'requests', id), { status: 'Cancelled' });
        alert("Request cancelled successfully.");
      } catch (error) {
        console.error("Error cancelling request:", error);
        alert("Failed to cancel request.");
      }
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#810100] w-10 h-10"/></div>;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-[#1B1717] uppercase">General Requests</h1>
          <p className="text-sm text-gray-500">Submit Overtime, Attendance corrections, or other HR inquiries</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-[#810100] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-bold hover:bg-[#630000]">
          <Plus className="w-5 h-5"/> New Request
        </button>
      </div>

      {/* REQUESTS TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#EDEBDD] border-b">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600">Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600">Effective Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-600 text-center">Action</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 font-bold uppercase">No requests found.</td></tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#1B1717]">{req.request_type}</p>
                      <p className="text-[10px] text-gray-400 uppercase">Filed: {req.date_submitted}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{req.date_effective || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        req.status === 'Approved' ? 'bg-green-50 text-green-700' :
                        req.status === 'Rejected' ? 'bg-red-50 text-red-700' :
                        req.status === 'Cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-50 text-yellow-700'
                      }`}>{req.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {req.status === 'Pending' && (
                          <button onClick={() => handleCancel(req.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        )}
                        <button onClick={() => { setSelectedRequest(req); setShowViewModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Eye className="w-4 h-4"/>
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

      {/* REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 bg-[#810100] text-white flex justify-between items-center">
              <h3 className="font-black text-xl tracking-tight uppercase">Submit Request</h3>
              <button onClick={() => setIsModalOpen(false)}><X/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Request Type *</label>
                <select 
                  className="w-full border-2 rounded-xl p-3 font-bold focus:border-[#810100] outline-none"
                  value={formData.request_type}
                  onChange={(e) => setFormData({...formData, request_type: e.target.value as any})}
                >
                  <option value="Overtime">Overtime Request</option>
                  <option value="Attendance Correction">Attendance Correction</option>
                  <option value="Other">Other HR Requests</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {formData.request_type !== 'Other' && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Effective Date *</label>
                    <input type="date" required className="w-full border-2 rounded-xl p-3 font-bold" value={formData.date_effective} onChange={e => setFormData({...formData, date_effective: e.target.value})}/>
                  </div>
                )}

                {formData.request_type === 'Overtime' && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Number of Hours *</label>
                    <input type="number" step="0.5" required className="w-full border-2 rounded-xl p-3 font-bold" value={formData.hours} onChange={e => setFormData({...formData, hours: e.target.value})} placeholder="e.g. 2.5"/>
                  </div>
                )}

                {formData.request_type === 'Attendance Correction' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Correct Time In</label>
                      <input type="time" required className="w-full border-2 rounded-xl p-3 font-bold" value={formData.time_in} onChange={e => setFormData({...formData, time_in: e.target.value})}/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Correct Time Out</label>
                      <input type="time" required className="w-full border-2 rounded-xl p-3 font-bold" value={formData.time_out} onChange={e => setFormData({...formData, time_out: e.target.value})}/>
                    </div>
                  </div>
                )}

                {formData.request_type === 'Other' && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Subject *</label>
                    <input type="text" required className="w-full border-2 rounded-xl p-3 font-bold" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="e.g. Certificate of Employment"/>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Reason / Description *</label>
                <textarea required className="w-full border-2 rounded-xl p-3 font-bold" rows={3} value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Explain your request..."/>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-[#810100] text-white p-4 rounded-xl font-black hover:bg-[#630000] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5"/> : <Send className="w-5 h-5"/>}
                {isSubmitting ? 'Sending...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 bg-[#810100] text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">Request Details</h3>
              <button onClick={() => { setShowViewModal(false); setSelectedRequest(null); }} className="hover:rotate-90 transition-transform">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h4 className="text-lg font-black text-[#1B1717] mb-4">Request Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Request Type</span>
                      <span className="text-sm font-medium text-[#1B1717]">{selectedRequest.request_type}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Effective Date</span>
                      <span className="text-sm font-medium text-[#1B1717]">{selectedRequest.date_effective || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Date Submitted</span>
                      <span className="text-sm font-medium text-[#1B1717]">{selectedRequest.date_submitted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        selectedRequest.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        selectedRequest.status === 'Cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedRequest.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h4 className="text-lg font-black text-[#1B1717] mb-4">Request Details</h4>
                  <div className="space-y-3">
                    {selectedRequest.request_type === 'Overtime' && selectedRequest.details.hours && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Requested Hours</span>
                        <span className="text-sm font-medium text-[#810100]">{selectedRequest.details.hours} hrs</span>
                      </div>
                    )}
                    {selectedRequest.request_type === 'Attendance Correction' && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Corrected Time In</span>
                          <span className="text-sm font-medium text-green-700">{selectedRequest.details.time_in || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Corrected Time Out</span>
                          <span className="text-sm font-medium text-red-700">{selectedRequest.details.time_out || "N/A"}</span>
                        </div>
                      </>
                    )}
                    {selectedRequest.request_type === 'Other' && selectedRequest.details.subject && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Subject</span>
                        <span className="text-sm font-medium text-[#1B1717]">{selectedRequest.details.subject}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h4 className="text-lg font-black text-[#1B1717] mb-4">Reason / Description</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedRequest.reason}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => { setShowViewModal(false); setSelectedRequest(null); }} className="px-6 py-3 bg-[#1B1717] text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-black transition-colors shadow-md">
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;