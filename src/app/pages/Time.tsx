import { Download, Check, X, Clock } from "lucide-react";
import { useState } from "react";

interface Timesheet {
  id: number;
  date: string;
  employee: string;
  hoursWorked: number;
  overtime: number;
  status: "Submitted" | "Approved" | "Rejected";
}

export default function Time() {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    employee: "",
    subUnit: "",
    status: "",
  });

  const timesheets: Timesheet[] = [
    {
      id: 1,
      date: "2026-02-28",
      employee: "Admin User",
      hoursWorked: 8,
      overtime: 1,
      status: "Approved",
    },
    {
      id: 2,
      date: "2026-03-01",
      employee: "Juan Dela Cruz",
      hoursWorked: 7.5,
      overtime: 0,
      status: "Submitted",
    },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const downloadReport = () => {
    const csv = [
      ["Date", "Employee", "Hours Worked", "Overtime", "Status"],
      ...timesheets.map((t) => [
        t.date,
        t.employee,
        t.hoursWorked,
        t.overtime,
        t.status,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "timesheet-report.csv";
    link.click();
  };

  return (
    <div className="p-8 space-y-8">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl text-[#1B1717] mb-2">Time</h1>
        <p className="text-[#1B1717]/60">
          Track attendance, timesheets, and working hours
        </p>
      </div>

      {/* FILTER CARD */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl text-[#1B1717] mb-4">
            Timesheet Management
          </h2>

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
              <label className="text-sm">Employee</label>
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

            <div>
              <label className="text-sm">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:border-[#810100] focus:outline-none"
              >
                <option value="">-- Select --</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
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

        {/* TIMESHEET TABLE */}
        <table className="w-full">
          <thead className="bg-[#EDEBDD]">
            <tr>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Employee</th>
              <th className="px-6 py-3 text-left">Hours Worked</th>
              <th className="px-6 py-3 text-left">Overtime</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {timesheets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                  No Records Found
                </td>
              </tr>
            ) : (
              timesheets.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-6 py-4">{t.date}</td>
                  <td className="px-6 py-4">{t.employee}</td>
                  <td className="px-6 py-4">{t.hoursWorked}</td>
                  <td className="px-6 py-4">{t.overtime}</td>
                  <td className="px-6 py-4">{t.status}</td>
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

      {/* REPORTS SECTION */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl text-[#1B1717] mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Time & Attendance Reports
        </h2>

        <ul className="list-disc ml-6 space-y-2 text-[#1B1717]/80">
          <li>Attendance Summary Report</li>
          <li>Employee Timesheet Report</li>
          <li>Overtime Analysis</li>
          <li>Late & Undertime Monitoring</li>
        </ul>
      </div>
    </div>
  );
}