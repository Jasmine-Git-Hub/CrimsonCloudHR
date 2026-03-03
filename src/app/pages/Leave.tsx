import { Search, Download, Check, X } from "lucide-react";
import { useState } from "react";

interface LeaveRecord {
  id: number;
  date: string;
  employee: string;
  leaveType: string;
  balance: number;
  days: number;
  status: "Pending" | "Approved" | "Rejected";
}

export default function Leave() {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    status: "Pending",
    leaveType: "",
    employee: "",
    subUnit: "",
  });

  const leaveRecords: LeaveRecord[] = [
    {
      id: 1,
      date: "2026-02-28",
      employee: "Juan Dela Cruz",
      leaveType: "Vacation Leave",
      balance: 8,
      days: 2,
      status: "Pending",
    },
    {
      id: 2,
      date: "2026-03-05",
      employee: "Maria Santos",
      leaveType: "Sick Leave",
      balance: 5,
      days: 1,
      status: "Approved",
    },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const downloadReport = () => {
    const csv = [
      ["Date", "Employee", "Leave Type", "Days", "Status"],
      ...leaveRecords.map((l) => [
        l.date,
        l.employee,
        l.leaveType,
        l.days,
        l.status,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "leave-report.csv";
    link.click();
  };

  return (
    <div className="p-8 space-y-8">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl text-[#1B1717] mb-2">Leave</h1>
        <p className="text-[#1B1717]/60">
          View, manage, and approve employee leave requests
        </p>
      </div>

      {/* FILTER CARD */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl text-[#1B1717] mb-4">Leave List</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm">From Date</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:border-[#810100] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm">To Date</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:border-[#810100] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm">Show Leave with Status *</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:border-[#810100] focus:outline-none"
              >
                <option value="Pending">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-sm">Leave Type</label>
              <select
                name="leaveType"
                value={filters.leaveType}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:border-[#810100] focus:outline-none"
              >
                <option value="">-- Select --</option>
                <option value="Vacation Leave">Vacation Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
              </select>
            </div>

            <div>
              <label className="text-sm">Employee Name</label>
              <input
                type="text"
                name="employee"
                placeholder="Type for hints..."
                value={filters.employee}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:border-[#810100] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm">Sub Unit</label>
              <select
                name="subUnit"
                value={filters.subUnit}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:border-[#810100] focus:outline-none"
              >
                <option value="">-- Select --</option>
                <option value="HR">HR</option>
                <option value="IT">IT</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-100">
              Reset
            </button>
            <button className="px-4 py-2 bg-[#810100] text-white rounded-lg hover:bg-[#630000]">
              Search
            </button>
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </div>

        {/* TABLE */}
        <table className="w-full">
          <thead className="bg-[#EDEBDD]">
            <tr>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Employee Name</th>
              <th className="px-6 py-3 text-left">Leave Type</th>
              <th className="px-6 py-3 text-left">Leave Balance</th>
              <th className="px-6 py-3 text-left">Days</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {leaveRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-gray-500">
                  No Records Found
                </td>
              </tr>
            ) : (
              leaveRecords.map((leave) => (
                <tr key={leave.id} className="border-t">
                  <td className="px-6 py-4">{leave.date}</td>
                  <td className="px-6 py-4">{leave.employee}</td>
                  <td className="px-6 py-4">{leave.leaveType}</td>
                  <td className="px-6 py-4">{leave.balance}</td>
                  <td className="px-6 py-4">{leave.days}</td>
                  <td className="px-6 py-4">{leave.status}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <Check className="w-4 h-4 text-green-600 cursor-pointer" />
                    <X className="w-4 h-4 text-red-600 cursor-pointer" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}