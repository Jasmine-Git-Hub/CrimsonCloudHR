import {
  DollarSign,
  Calendar,
  TrendingUp,
  Download,
  Search,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function Payroll() {
  const payrollSummary = [
    { month: "January", total: 145250, employees: 145, status: "Processed" },
    { month: "February", total: 148320, employees: 145, status: "Processed" },
    { month: "March", total: 152100, employees: 147, status: "Processing" },
  ];

  const recentPayments = [
    {
      id: 1,
      employee: "Jasmine Michaela Espiritu",
      amount: 5500,
      date: "Mar 1, 2026",
      status: "Paid",
    },
    {
      id: 2,
      employee: "John Michael Doe",
      amount: 6200,
      date: "Mar 1, 2026",
      status: "Paid",
    },
    {
      id: 3,
      employee: "Sarah Jane Smith",
      amount: 4800,
      date: "Mar 1, 2026",
      status: "Paid",
    },
    {
      id: 4,
      employee: "Michael Robert Brown",
      amount: 5100,
      date: "Mar 1, 2026",
      status: "Pending",
    },
    {
      id: 5,
      employee: "Emily Rose Johnson",
      amount: 5800,
      date: "Mar 1, 2026",
      status: "Paid",
    },
  ];

  const payrollStats = [
    {
      label: "Total Payroll This Month",
      value: "$152,100",
      icon: DollarSign,
      color: "#810100",
    },
    {
      label: "Average Salary",
      value: "$5,438",
      icon: TrendingUp,
      color: "#630000",
    },
    {
      label: "Processed Payments",
      value: "142",
      icon: CheckCircle,
      color: "#810100",
    },
    {
      label: "Pending Payments",
      value: "5",
      icon: Clock,
      color: "#630000",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[#1B1717] mb-2">Payroll Management</h1>
          <p className="text-[#1B1717]/60">
            Manage employee compensation, salaries, and payment processing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#810100] text-[#810100] rounded-lg hover:bg-[#810100] hover:text-white transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button className="flex items-center gap-2 bg-[#810100] text-white px-6 py-3 rounded-lg hover:bg-[#630000] transition-colors">
            <Calendar className="w-5 h-5" />
            Process Payroll
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {payrollStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-2xl text-[#1B1717] mb-1">{stat.value}</p>
            <p className="text-sm text-[#1B1717]/60">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Payroll Summary */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl text-[#1B1717]">Monthly Payroll Summary</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#EDEBDD]">
              <tr>
                <th className="px-6 py-3 text-left text-sm text-[#1B1717]">Month</th>
                <th className="px-6 py-3 text-left text-sm text-[#1B1717]">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-sm text-[#1B1717]">
                  Employees Paid
                </th>
                <th className="px-6 py-3 text-left text-sm text-[#1B1717]">Status</th>
                <th className="px-6 py-3 text-left text-sm text-[#1B1717]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payrollSummary.map((item, index) => (
                <tr key={index} className="hover:bg-[#EDEBDD]/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#630000]" />
                      <span className="text-[#1B1717]">{item.month} 2026</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg text-[#810100]">
                      ${item.total.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#1B1717]">{item.employees}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        item.status === "Processed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-2 text-[#810100] hover:text-[#630000] transition-colors">
                      <FileText className="w-4 h-4" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-[#1B1717]">Recent Payments</h2>
            <button className="text-sm text-[#810100] hover:text-[#630000]">
              View All →
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1B1717]/40" />
            <input
              type="text"
              placeholder="Search by employee name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#EDEBDD]">
              <tr>
                <th className="px-6 py-3 text-left text-sm text-[#1B1717]">Employee</th>
                <th className="px-6 py-3 text-left text-sm text-[#1B1717]">Amount</th>
                <th className="px-6 py-3 text-left text-sm text-[#1B1717]">
                  Payment Date
                </th>
                <th className="px-6 py-3 text-left text-sm text-[#1B1717]">Status</th>
                <th className="px-6 py-3 text-left text-sm text-[#1B1717]">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-[#EDEBDD]/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#810100] to-[#630000] flex items-center justify-center text-white">
                        {payment.employee
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="text-[#1B1717]">{payment.employee}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg text-[#810100]">
                      ${payment.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#1B1717]/60">{payment.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        payment.status === "Paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-2 text-[#810100] hover:text-[#630000] transition-colors">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payroll Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl text-[#1B1717] mb-6">Payroll Trend (Last 6 Months)</h2>
        <div className="h-64 flex items-end gap-6">
          {[
            { month: "Oct", amount: 138000 },
            { month: "Nov", amount: 142500 },
            { month: "Dec", amount: 140000 },
            { month: "Jan", amount: 145250 },
            { month: "Feb", amount: 148320 },
            { month: "Mar", amount: 152100 },
          ].map((data, index) => {
            const height = (data.amount / 160000) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-sm text-[#1B1717]">
                  ${(data.amount / 1000).toFixed(0)}K
                </div>
                <div
                  className="w-full bg-gradient-to-t from-[#810100] to-[#630000] rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                  style={{ height: `${height}%` }}
                ></div>
                <div className="text-sm text-[#1B1717]/60">{data.month}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
