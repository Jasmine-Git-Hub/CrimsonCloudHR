import { Search, Calendar, Eye, Loader2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../../config/firebaseSetup";

interface AttendanceRecord {
  id: string;
  employeeName: string;
  totalDuration: number;
  date: string;
  timeIn?: string;
  timeOut?: string;
  status: string;
}

export default function Attendance() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // ==============================
  // 🛡️ REAL-TIME DATA INTEGRATION
  // ==============================
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "timesheets"));
    
    // Nakikinig live sa anumang changes sa timesheets
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attendanceData: AttendanceRecord[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        attendanceData.push({
          id: doc.id,
          employeeName: data.employeeName || "Unknown",
          totalDuration: (data.hoursWorked || 0) + (data.overtime || 0),
          date: data.date || "",
          timeIn: data.timeIn,
          timeOut: data.timeOut,
          status: data.status || "Submitted"
        });
      });

      // Sort: Latest date muna
      attendanceData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAttendanceRecords(attendanceData);
      setLoading(false);
    }, (error) => {
      console.error("Error live-fetching attendance:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !selectedDate || record.date === selectedDate;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[#1B1717] mb-2">Attendance</h1>
          <p className="text-[#1B1717]/60">View and manage employee attendance records live</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input autoComplete="off"
                type="text"
                placeholder="Type for hints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input autoComplete="off"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]"
            />
          </div>

          <div className="flex items-end">
            <button className="flex items-center gap-2 bg-[#810100] text-white px-6 py-2 rounded-lg hover:bg-[#630000] transition-colors">
              <Calendar className="w-4 h-4" /> View
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl text-[#1B1717]">Attendance Records</h2>
            <span className="text-sm text-gray-500">({filteredRecords.length}) Records Found</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#810100]" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#EDEBDD]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Employee Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Time Logs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Total Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><div className="font-medium text-[#1B1717]">{record.employeeName}</div></td>
                    <td className="px-6 py-4"><div className="text-sm text-gray-600">{record.date}</div></td>
                    <td className="px-6 py-4">
                      {record.timeIn && record.timeOut ? (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium text-green-700">{record.timeIn}</span> - <span className="font-medium text-red-700">{record.timeOut}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Manual Entry / In Progress</span>
                      )}
                    </td>
                    <td className="px-6 py-4"><span className="text-sm font-medium text-[#1B1717]">{record.totalDuration.toFixed(1)}</span></td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.status === "Approved" ? "bg-green-100 text-green-700" : record.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => { setSelectedRecord(record); setShowViewModal(true); }} className="flex items-center gap-1 text-[#810100] hover:text-[#630000] transition-colors text-sm font-medium">
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
                
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="w-12 h-12 text-gray-300" />
                        <p>No attendance records found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* VIEW MODAL */}
      {showViewModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
             <div className="flex items-center justify-between p-6 bg-[#810100] text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">Attendance Details</h3>
              <button onClick={() => { setShowViewModal(false); setSelectedRecord(null); }} className="hover:rotate-90 transition-transform">
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
                      <span className="text-sm font-medium text-[#1B1717]">{selectedRecord.employeeName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Date</span>
                      <span className="text-sm font-medium text-[#1B1717]">{selectedRecord.date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${selectedRecord.status === 'Approved' ? 'bg-green-100 text-green-700' : selectedRecord.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {selectedRecord.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h4 className="text-lg font-black text-[#1B1717] mb-4">Time Tracking Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Time In</span>
                      <span className="text-sm font-medium text-green-700">{selectedRecord.timeIn || "No Record"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Time Out</span>
                      <span className="text-sm font-medium text-red-700">{selectedRecord.timeOut || "No Record"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Hours</span>
                      <span className="text-sm font-medium text-[#1B1717]">{selectedRecord.totalDuration.toFixed(1)} hrs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
             <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => { setShowViewModal(false); setSelectedRecord(null); }} className="px-6 py-3 bg-[#1B1717] text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-black transition-colors shadow-md">
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}