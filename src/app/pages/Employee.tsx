import { Search, Plus, Filter, Download, Mail, Phone, MapPin } from "lucide-react";

export default function Employee() {
  const employees = [
    {
      id: 1,
      name: "Jasmine Michaela Espiritu",
      employeeId: "EMP001",
      department: "Human Resources",
      jobTitle: "HR Manager",
      email: "jasmine@orangehrm.com",
      phone: "+1 (555) 123-4567",
      status: "Active",
      hireDate: "Jan 15, 2023",
    },
    {
      id: 2,
      name: "John Michael Doe",
      employeeId: "EMP002",
      department: "Engineering",
      jobTitle: "Software Engineer",
      email: "john.doe@orangehrm.com",
      phone: "+1 (555) 234-5678",
      status: "Active",
      hireDate: "Mar 10, 2023",
    },
    {
      id: 3,
      name: "Sarah Jane Smith",
      employeeId: "EMP003",
      department: "Marketing",
      jobTitle: "Marketing Specialist",
      email: "sarah.smith@orangehrm.com",
      phone: "+1 (555) 345-6789",
      status: "Active",
      hireDate: "Apr 22, 2023",
    },
    {
      id: 4,
      name: "Michael Robert Brown",
      employeeId: "EMP004",
      department: "Sales",
      jobTitle: "Sales Representative",
      email: "michael.brown@orangehrm.com",
      phone: "+1 (555) 456-7890",
      status: "On Leave",
      hireDate: "Feb 5, 2023",
    },
    {
      id: 5,
      name: "Emily Rose Johnson",
      employeeId: "EMP005",
      department: "Finance",
      jobTitle: "Finance Officer",
      email: "emily.johnson@orangehrm.com",
      phone: "+1 (555) 567-8901",
      status: "Active",
      hireDate: "May 18, 2023",
    },
    {
      id: 6,
      name: "David Lee Wilson",
      employeeId: "EMP006",
      department: "Engineering",
      jobTitle: "Project Manager",
      email: "david.wilson@orangehrm.com",
      phone: "+1 (555) 678-9012",
      status: "Active",
      hireDate: "Jan 28, 2023",
    },
  ];

  const departments = [
    { name: "Human Resources", count: 12, color: "#810100" },
    { name: "Engineering", count: 45, color: "#630000" },
    { name: "Marketing", count: 18, color: "#810100" },
    { name: "Sales", count: 28, color: "#630000" },
    { name: "Finance", count: 15, color: "#810100" },
    { name: "Operations", count: 27, color: "#630000" },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[#1B1717] mb-2">Employee Management</h1>
          <p className="text-[#1B1717]/60">
            Manage employee information, records, and department assignments
          </p>
        </div>
        <button className="flex items-center gap-2 bg-[#810100] text-white px-6 py-3 rounded-lg hover:bg-[#630000] transition-colors">
          <Plus className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      {/* Department Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {departments.map((dept, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div
              className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
              style={{ backgroundColor: `${dept.color}20` }}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: dept.color }}
              ></div>
            </div>
            <h3 className="text-sm text-[#1B1717]/60 mb-1">{dept.name}</h3>
            <p className="text-2xl text-[#1B1717]">{dept.count}</p>
          </div>
        ))}
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-xl text-[#1B1717]">Employee Directory</h2>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-[#810100] text-[#810100] rounded-lg hover:bg-[#810100] hover:text-white transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-[#810100] text-[#810100] rounded-lg hover:bg-[#810100] hover:text-white transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1B1717]/40" />
            <input
              type="text"
              placeholder="Search by name, employee ID, or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]"
            />
          </div>
        </div>

        {/* Employee Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-[#810100] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#810100] to-[#630000] flex items-center justify-center text-white text-xl">
                    {employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg text-[#1B1717] mb-1">{employee.name}</h3>
                    <p className="text-sm text-[#1B1717]/60">{employee.employeeId}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      employee.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {employee.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[#1B1717]/60">
                    <MapPin className="w-4 h-4 text-[#630000]" />
                    <span>{employee.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#1B1717]/60">
                    <Mail className="w-4 h-4 text-[#630000]" />
                    <span>{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#1B1717]/60">
                    <Phone className="w-4 h-4 text-[#630000]" />
                    <span>{employee.phone}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#1B1717]/60">
                      Hired: {employee.hireDate}
                    </span>
                    <button className="text-sm text-[#810100] hover:text-[#630000]">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-[#1B1717]/60">Showing 6 of 145 employees</p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-[#EDEBDD] transition-colors text-[#1B1717]">
              Previous
            </button>
            <button className="px-4 py-2 bg-[#810100] text-white rounded-lg">1</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-[#EDEBDD] transition-colors text-[#1B1717]">
              2
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-[#EDEBDD] transition-colors text-[#1B1717]">
              3
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-[#EDEBDD] transition-colors text-[#1B1717]">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
