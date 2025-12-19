"use client";
import { useState, useEffect } from "react";
import { Users, Search, Eye, Download, ArrowUpDown, RefreshCw, Briefcase, Award, UserCheck } from "lucide-react";
import { positions, departments } from "../../utils/positionData";

// Define employee interface
interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  status: "Active" | "Inactive" | "On Leave";
  hireDate: string;
  phoneNumber: string;
  salary: number;
  role: string;
}

export default function ManageEmployeePage() {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof Employee>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Status options
  const statusOptions = ["Active", "Inactive", "On Leave"];

  // Load employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [searchTerm, departmentFilter, statusFilter, employees]);

  // Fetch employees from API
  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');

      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees);
        setFilteredEmployees(data.employees);
      } else {
        setErrorMessage(data.error || 'Failed to load employees');
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setErrorMessage('Error connecting to server');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters and search
  const applyFiltersAndSearch = () => {
    let result = [...employees];

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(emp =>
        emp.firstName.toLowerCase().includes(term) ||
        emp.lastName.toLowerCase().includes(term) ||
        emp.employeeId.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term) ||
        emp.position.toLowerCase().includes(term)
      );
    }

    // Apply department filter
    if (departmentFilter !== "all") {
      result = result.filter(emp => emp.department === departmentFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(emp => emp.status === statusFilter);
    }

    // Apply sorting
    result = result.sort((a, b) => {
      const fieldA = a[sortField];
      const fieldB = b[sortField];

      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        return sortDirection === 'asc' ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
      } else {
        return sortDirection === 'asc' ?
          (fieldA as number) - (fieldB as number) :
          (fieldB as number) - (fieldA as number);
      }
    });

    setFilteredEmployees(result);
  };

  // Handle sort toggle
  const handleSort = (field: keyof Employee) => {
    setSortDirection(field === sortField ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortField(field);
  };

  // Open view modal
  const openViewModal = (employee: Employee) => {
    setCurrentEmployee(employee);
    setShowViewModal(true);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Employee ID", "First Name", "Last Name", "Email", "Position", "Department", "Status", "Hire Date", "Phone Number", "Salary", "Role"];
    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map(emp => [
        emp.employeeId, `"${emp.firstName}"`, `"${emp.lastName}"`, `"${emp.email}"`,
        `"${emp.position}"`, `"${emp.department}"`, emp.status, emp.hireDate,
        `"${emp.phoneNumber}"`, emp.salary, emp.role
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Get unique departments for filter dropdown
  const departmentsList = ["all", ...new Set(employees.map(emp => emp.department))];

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    const bgColor = status === "Active" ? "bg-green-100 text-green-800" :
      status === "Inactive" ? "bg-red-100 text-red-800" :
        "bg-yellow-100 text-yellow-800";

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
        {status}
      </span>
    );
  };

  // Render role icon based on employee role
  const renderRoleIcon = (role: string) => {
    if (role === "Manager") {
      return <Briefcase className="h-5 w-5 text-blue-500" />;
    } else if (role === "Admin") {
      return <Award className="h-5 w-5 text-purple-500" />;
    } else {
      return <UserCheck className="h-5 w-5 text-green-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Employee Management</h2>
        <p className="text-gray-600">Manage employee records, update information, and export data.</p>
      </div>

      {/* Error Messages */}
      {errorMessage && (
        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by employee name, ID or position..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departmentsList.filter(d => d !== "all").map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <button
              onClick={exportToCSV}
              className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-600 transition whitespace-nowrap"
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </button>

            <button
              onClick={fetchEmployees}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center hover:bg-gray-300 transition whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-grow overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredEmployees.length > 0 ? (
          <div className="overflow-x-auto flex-grow">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-700 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    <button onClick={() => handleSort('employeeId')} className="flex items-center gap-1 hover:text-blue-600">
                      Employee ID
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    <button onClick={() => handleSort('firstName')} className="flex items-center gap-1 hover:text-blue-600">
                      Name
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    <button onClick={() => handleSort('position')} className="flex items-center gap-1 hover:text-blue-600">
                      Position
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    <button onClick={() => handleSort('department')} className="flex items-center gap-1 hover:text-blue-600">
                      Department
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-blue-600">
                      Status
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    <button onClick={() => handleSort('salary')} className="flex items-center gap-1 hover:text-blue-600">
                      Salary
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                    <button onClick={() => handleSort('role')} className="flex items-center gap-1 hover:text-blue-600">
                      Role
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{employee.employeeId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex items-center">
                        {renderRoleIcon(employee.role)}
                        <span className="ml-2">{employee.firstName} {employee.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.position}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.department}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {renderStatusBadge(employee.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">₱{employee.salary.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.role}</td>
                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                      <button
                        onClick={() => openViewModal(employee)}
                        className="p-1 rounded-full hover:bg-blue-100 text-blue-600"
                        title="View Employee Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Employees Found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your search or filters.</p>
          </div>
        )}
        <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      </div>

      {/* View Employee Modal */}
      {showViewModal && currentEmployee && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {renderRoleIcon(currentEmployee.role)}
                <h3 className="text-xl font-semibold text-gray-800">{currentEmployee.firstName} {currentEmployee.lastName}</h3>
              </div>
              <div>{renderStatusBadge(currentEmployee.status)}</div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-3">Employee Information</h4>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[120px_1fr] py-2 border-b border-gray-100">
                      <div className="text-gray-600 font-medium">Employee ID</div>
                      <div className="text-gray-900 break-words">{currentEmployee.employeeId}</div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] py-2 border-b border-gray-100">
                      <div className="text-gray-600 font-medium">Email</div>
                      <div className="text-gray-900 break-all">{currentEmployee.email}</div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] py-2 border-b border-gray-100">
                      <div className="text-gray-600 font-medium">Phone Number</div>
                      <div className="text-gray-900 break-words">{currentEmployee.phoneNumber}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-3">Position Details</h4>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[120px_1fr] py-2 border-b border-gray-100">
                      <div className="text-gray-600 font-medium">Position</div>
                      <div className="text-gray-900 break-words">{currentEmployee.position}</div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] py-2 border-b border-gray-100">
                      <div className="text-gray-600 font-medium">Department</div>
                      <div className="text-gray-900 break-words">{currentEmployee.department}</div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] py-2 border-b border-gray-100">
                      <div className="text-gray-600 font-medium">Role</div>
                      <div className="text-gray-900 break-words">{currentEmployee.role}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3">Employment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="grid grid-cols-[120px_1fr] py-2 border-b border-gray-100">
                      <div className="text-gray-600 font-medium">Hire Date</div>
                      <div className="text-gray-900 break-words">{new Date(currentEmployee.hireDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] py-2 border-b border-gray-100">
                      <div className="text-gray-600 font-medium">Status</div>
                      <div className="text-gray-900 break-words">{currentEmployee.status}</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[120px_1fr] py-2 border-b border-gray-100">
                      <div className="text-gray-600 font-medium">Salary</div>
                      <div className="text-gray-900 break-words">₱{currentEmployee.salary.toLocaleString()}</div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] py-2 border-b border-gray-100">
                      <div className="text-gray-600 font-medium">Employment Duration</div>
                      <div className="text-gray-900 break-words">
                        {(() => {
                          const hireDate = new Date(currentEmployee.hireDate);
                          const today = new Date();
                          const diffTime = Math.abs(today.getTime() - hireDate.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          const years = Math.floor(diffDays / 365);
                          const months = Math.floor((diffDays % 365) / 30);

                          if (years > 0) {
                            return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? `and ${months} month${months > 1 ? 's' : ''}` : ''}`;
                          } else if (months > 0) {
                            return `${months} month${months > 1 ? 's' : ''}`;
                          } else {
                            return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3 border-t pt-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}