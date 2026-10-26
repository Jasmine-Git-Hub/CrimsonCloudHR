import { Search, Plus, Filter, Download, Mail, Phone, MapPin, X, Eye, Loader2, ChevronDown, Edit, Save } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebaseSetup";
import { DEPARTMENTS } from "../lib/departments";

interface EmployeeData {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  email: string;
  phone: string;
  status: "Active" | "On Leave" | "Inactive";
  hireDate: string;
  role?: string;
  username?: string;
}

export default function Employee() {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  
  // Filter states
  const [showFilter, setShowFilter] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Form state for new employee
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    jobTitle: "",
    email: "",
    phone: "",
    status: "Active" as "Active" | "On Leave" | "Inactive",
    hireDate: "",
  });

  // Form state for editing employee
  const [editFormData, setEditFormData] = useState({
    name: "",
    employeeId: "",
    department: "",
    jobTitle: "",
    email: "",
    phone: "",
    status: "Active" as "Active" | "On Leave" | "Inactive",
    hireDate: "",
  });

  // Department list for filter and add modal (shared with Dashboard)
  const departmentOptions: string[] = [...DEPARTMENTS];

  /**
   * AUTO-GENERATED ID LOGIC
   * Generates IDs in the format: EMP-2026-0001
   */
  const nextEmployeeId = useMemo(() => {
    const year = new Date().getFullYear();
    const prefix = `EMP-${year}-`;
    
    // Find numeric parts of existing IDs that match the current year's prefix
    const idNumbers = employees
      .map(emp => emp.employeeId || "")
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, ""), 10))
      .filter(num => !isNaN(num));

    const highestId = idNumbers.length > 0 ? Math.max(...idNumbers) : 0;
    const nextNumber = (highestId + 1).toString().padStart(4, '0');
    
    return `${prefix}${nextNumber}`;
  }, [employees]);

  // Compute department counts from employees
  const departmentCounts = employees.reduce((acc, emp) => {
    acc[emp.department] = (acc[emp.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const colors = ["#810100", "#630000"];
  const departments = Object.entries(departmentCounts).map(([name, count], index) => ({
    name,
    count,
    color: colors[index % colors.length],
  }));

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "employees"));
      const fetched: EmployeeData[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as EmployeeData);
      });
      setEmployees(fetched);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
    // 1. Kunin ang employees real-time
    const unsubscribe = onSnapshot(collection(db, "employees"), (snapshot) => {
      const fetched: EmployeeData[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as EmployeeData);
      });
      setEmployees(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching employees:", error);
      setLoading(false);
    });

    // ❌ Binura na natin dito yung fetchHiredApplicants() para hindi mag-error

    return () => unsubscribe();
  }, []);
    
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDepartment ? emp.department === filterDepartment : true;
    const matchesStatus = filterStatus ? emp.status === filterStatus : true;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddEmployee = async () => {
    if (!formData.name || !formData.email || !formData.department) {
      alert("Please fill in required fields.");
      return;
    }

    try {
      // Attach the auto-generated ID to the data
      const submissionData = {
        ...formData,
        employeeId: nextEmployeeId,
      };

      await addDoc(collection(db, "employees"), submissionData);

      // 🟢 AUTO-ASSIGN TRAINING MODULES PAGKA-SAVE
      const trainingModules = [
        {
          title: `Onboarding: ${formData.jobTitle} Essentials`,
          description: `Welcome to the team! This module covers your core responsibilities as a ${formData.jobTitle} in the ${formData.department} department.`,
          status: 'Pending',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          employeeId: nextEmployeeId,
          link: "https://crimsoncloud-hr.com/training/start"
        }
      ];

      for (const module of trainingModules) {
        await addDoc(collection(db, "trainings"), module);
      }

      setShowAddModal(false);
      setFormData({
        name: "",
        department: "",
        jobTitle: "",
        email: "",
        phone: "",
        status: "Active",
        hireDate: "",
      });
      // ❌ Tinanggal na natin yung fetchHiredApplicants() dito para hindi mag-error.
      alert(`Employee added successfully with ID: ${nextEmployeeId}`);
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Failed to add employee.");
    }
  };

  const viewEmployee = (emp: EmployeeData) => {
    setSelectedEmployee(emp);
    setShowViewModal(true);
  };

  const editEmployee = (emp: EmployeeData) => {
    setSelectedEmployee(emp);
    setEditFormData({
      name: emp.name,
      employeeId: emp.employeeId,
      department: emp.department,
      jobTitle: emp.jobTitle,
      email: emp.email,
      phone: emp.phone,
      status: emp.status,
      hireDate: emp.hireDate,
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;
    
    try {
      const employeeRef = doc(db, "employees", selectedEmployee.id);
      await updateDoc(employeeRef, editFormData);
      setShowEditModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("Failed to update employee.");
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Employee ID", "Department", "Job Title", "Email", "Phone", "Status", "Hire Date"];
    const rows = filteredEmployees.map(emp => [emp.name, emp.employeeId, emp.department, emp.jobTitle, emp.email, emp.phone, emp.status, emp.hireDate]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "employees.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const clearFilters = () => {
    setFilterDepartment("");
    setFilterStatus("");
    setSearchQuery("");
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[#1B1717] mb-2">Employee Management</h1>
          <p className="text-[#1B1717]/60">Manage employee information, records, and department assignments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#810100] text-white px-6 py-3 rounded-lg hover:bg-[#630000] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      {/* Department Overview */}
      {departments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {departments.map((dept, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setFilterDepartment(dept.name)}
            >
              <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center" style={{ backgroundColor: `${dept.color}20` }}>
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: dept.color }}></div>
              </div>
              <h3 className="text-sm text-[#1B1717]/60 mb-1">{dept.name}</h3>
              <p className="text-2xl text-[#1B1717]">{dept.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-xl text-[#1B1717]">Employee Directory</h2>
            <div className="flex items-center gap-3 relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="flex items-center gap-2 px-4 py-2 border border-[#810100] text-[#810100] rounded-lg hover:bg-[#810100] hover:text-white transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filter
                {(filterDepartment || filterStatus) && (
                  <span className="ml-1 bg-[#810100] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {(filterDepartment ? 1 : 0) + (filterStatus ? 1 : 0)}
                  </span>
                )}
              </button>
              {showFilter && (
                <div className="absolute right-0 top-12 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-10 p-4">
                  <h3 className="font-medium text-gray-700 mb-3">Filter Employees</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Department</label>
                      <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">All Departments</option>
                        {departmentOptions.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Status</label>
                      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="flex justify-between pt-2">
                      <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
                      <button onClick={() => setShowFilter(false)} className="px-3 py-1 bg-[#810100] text-white rounded-lg text-sm">Apply</button>
                    </div>
                  </div>
                </div>
              )}
              <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 border border-[#810100] text-[#810100] rounded-lg hover:bg-[#810100] hover:text-white transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1B1717]/40" />
            <input autoComplete="off"
              type="text"
              placeholder="Search by name, employee ID, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]"
            />
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#810100]" /></div>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No employees found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-[#810100] transition-all cursor-pointer" onClick={() => viewEmployee(employee)}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#810100] to-[#630000] flex items-center justify-center text-white text-xl">
                      {getInitials(employee.name)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg text-[#1B1717] mb-1">{employee.name}</h3>
                      <p className="text-sm text-[#1B1717]/60 font-mono">{employee.employeeId}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${employee.status === "Active" ? "bg-green-100 text-green-700" : employee.status === "On Leave" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
                      {employee.status}
                    </span>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-[#1B1717]/60"><MapPin className="w-4 h-4 text-[#630000]" /> {employee.department}</div>
                    <div className="flex items-center gap-2 text-sm text-[#1B1717]/60"><Mail className="w-4 h-4 text-[#630000]" /> {employee.email}</div>
                    <div className="flex items-center gap-2 text-sm text-[#1B1717]/60"><Phone className="w-4 h-4 text-[#630000]" /> {employee.phone}</div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#1B1717]/60">Hired: {employee.hireDate}</span>
                      <div className="flex items-center gap-2">
                        <button className="text-sm text-[#810100] hover:text-[#630000] flex items-center gap-1" onClick={(e) => { e.stopPropagation(); editEmployee(employee); }}><Edit className="w-4 h-4" /> Edit</button>
                        <button className="text-sm text-[#810100] hover:text-[#630000] flex items-center gap-1" onClick={(e) => { e.stopPropagation(); viewEmployee(employee); }}><Eye className="w-4 h-4" /> View Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-[#1B1717]">Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">System Generated ID</label>
                  <input autoComplete="off" type="text" value={nextEmployeeId} readOnly className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 font-mono cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input autoComplete="off" type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select name="department" value={formData.department} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" required>
                    <option value="">Select department</option>
                    {departmentOptions.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                  <input autoComplete="off" type="text" name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input autoComplete="off" type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input autoComplete="off" type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input autoComplete="off" type="date" name="hireDate" value={formData.hireDate} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddEmployee} className="px-4 py-2 bg-[#810100] text-white rounded-lg hover:bg-[#630000]">Add Employee</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-[#1B1717]">Edit Employee</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input autoComplete="off" type="text" name="name" value={editFormData.name} onChange={handleEditInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
                  <input autoComplete="off" type="text" name="employeeId" value={editFormData.employeeId} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select name="department" value={editFormData.department} onChange={handleEditInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" required>
                    {departmentOptions.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                  <input autoComplete="off" type="text" name="jobTitle" value={editFormData.jobTitle} onChange={handleEditInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input autoComplete="off" type="email" name="email" value={editFormData.email} onChange={handleEditInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input autoComplete="off" type="tel" name="phone" value={editFormData.phone} onChange={handleEditInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={editFormData.status} onChange={handleEditInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input autoComplete="off" type="date" name="hireDate" value={editFormData.hireDate} onChange={handleEditInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdateEmployee} className="flex items-center gap-2 px-4 py-2 bg-[#810100] text-white rounded-lg hover:bg-[#630000]"><Save className="w-4 h-4" /> Update Employee</button>
            </div>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-[#1B1717]">Employee Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#810100] to-[#630000] flex items-center justify-center text-white text-2xl">
                  {getInitials(selectedEmployee.name)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#1B1717]">{selectedEmployee.name}</h2>
                  <p className="text-gray-600 font-mono">{selectedEmployee.employeeId}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Department</p><p className="font-medium">{selectedEmployee.department}</p></div>
                <div><p className="text-sm text-gray-500">Job Title</p><p className="font-medium">{selectedEmployee.jobTitle}</p></div>
                <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{selectedEmployee.email}</p></div>
                <div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{selectedEmployee.phone}</p></div>
                <div><p className="text-sm text-gray-500">Status</p><span className={`px-2 py-1 inline-block rounded-full text-xs ${selectedEmployee.status === "Active" ? "bg-green-100 text-green-700" : selectedEmployee.status === "On Leave" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>{selectedEmployee.status}</span></div>
                <div><p className="text-sm text-gray-500">Hire Date</p><p className="font-medium">{selectedEmployee.hireDate}</p></div>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t"><button onClick={() => setShowViewModal(false)} className="px-4 py-2 bg-[#810100] text-white rounded-lg hover:bg-[#630000]">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}