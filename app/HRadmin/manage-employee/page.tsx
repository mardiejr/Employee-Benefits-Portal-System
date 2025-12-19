"use client";
import { useState, useEffect } from "react";
import { Users, Plus, Search, Edit, Trash2, Check, X, Download, ArrowUpDown, RefreshCw } from "lucide-react";
import { positions, departments, getNextEmployeeId, getPositionSalary, getRoleClass } from "../../utils/positionData";

// Define employee interface
interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  middleName?: string; // Added middle name
  lastName: string;
  email: string;
  position: string;
  department: string;
  status: "Active" | "Inactive" | "On Leave";
  hireDate: string;
  phoneNumber: string;
  salary: number;
  role: string;
  gender?: string; // Added gender
  nationality?: string; // Added nationality
  address?: string; // Added address
  benefits_package?: string; // Added benefits package
  benefits_amount_remaining?: number; // Added benefits amount remaining
}

// Define new hire interface with new fields
interface NewHire {
  id: number;
  employeeId: string;
  firstName: string;
  middleName?: string; // Added middle name
  lastName: string;
  email: string;
  gender?: string;
  nationality?: string;
  address?: string;
  phoneNumber: string;
  department?: string;
  position?: string;
  hireDate: string;
}

export default function ManageEmployeePage() {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [newHires, setNewHires] = useState<NewHire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof Employee>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedNewHireId, setSelectedNewHireId] = useState<number | "">("");

  // New state to track if we're using new hire data
  const [usingNewHireData, setUsingNewHireData] = useState(false);

  // Form data for employee
  const [formData, setFormData] = useState({
    employeeId: "",
    firstName: "",
    middleName: "", // Added middle name
    lastName: "",
    email: "",
    position: "",
    department: "",
    status: "Active" as "Active" | "Inactive" | "On Leave",
    hireDate: "",
    phoneNumber: "",
    salary: 0,
    role: "",
    roleClass: "",
    gender: "", // Added gender
    nationality: "", // Added nationality
    address: "", // Added address
    benefits_package: "", // Added benefits package
    benefits_amount_remaining: 0 // Added benefits amount remaining
  });

  // Status options
  const statusOptions = ["Active", "Inactive", "On Leave"];

  // Load employees and new hires on component mount
  useEffect(() => {
    fetchEmployees();
    fetchNewHires();
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [searchTerm, departmentFilter, statusFilter, employees]);

  // Phone number validation and formatting
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    
    // Enforce the 11-digit limit and starting with 09
    if (digitsOnly.length <= 11) {
      setFormData(prev => ({
        ...prev,
        [name]: digitsOnly
      }));
    }
  };

  // Validate phone number format when submitting
  const isValidPhoneNumber = (phoneNumber: string) => {
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(phoneNumber);
  };

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

  // Fetch new hires from API
  const fetchNewHires = async () => {
    try {
      const response = await fetch('/api/admin/new-hires');
      if (!response.ok) throw new Error('Failed to fetch new hires');

      const data = await response.json();
      if (data.success) {
        setNewHires(data.newHires || []);
      } else {
        console.error(data.error || 'Failed to load new hires');
      }
    } catch (error) {
      console.error("Error fetching new hires:", error);
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
        (emp.middleName && emp.middleName.toLowerCase().includes(term)) || // Include middle name in search
        emp.lastName.toLowerCase().includes(term) ||
        emp.employeeId.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term)
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

  // Helper to get the appropriate benefits package based on role class
  const getBenefitsPackage = (roleClass: string) => {
    if (roleClass === "Class A" || roleClass === "Class B") {
      return {
        package: "Package B",
        amount: 200000
      };
    } else if (roleClass === "Class C") {
      return {
        package: "Package A",
        amount: 100000
      };
    }
    return {
      package: "",
      amount: 0
    };
  };

  // Handle form input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Special handling for position change - only when not using new hire data
    if (name === 'position' && !usingNewHireData) {
      // Get the position's default salary
      const salary = getPositionSalary(value);

      // Auto-generate employee ID based on position
      const employeeId = getNextEmployeeId(value, employees);

      // Get role class based on position
      const roleClass = getRoleClass(value);
      
      // Get benefits package based on role class
      const benefitsPackage = getBenefitsPackage(roleClass);

      // Update form with new values
      setFormData(prev => ({
        ...prev,
        position: value,
        salary: salary,
        employeeId: employeeId,
        role: roleClass, // Use role class directly as the role
        roleClass: roleClass,
        benefits_package: benefitsPackage.package,
        benefits_amount_remaining: benefitsPackage.amount
      }));
    } else if (name === "newHireSelect") {
      // Handle new hire selection
      const newHireId = parseInt(value);
      setSelectedNewHireId(newHireId);

      if (newHireId) {
        const selectedHire = newHires.find(hire => hire.id === newHireId);
        if (selectedHire) {
          // Initialize salary, role, and employeeId values
          let newSalary = 0;
          let newRoleClass = "";
          let newEmployeeId = "";

          // If position was provided from new hire, use it to calculate derived values
          if (selectedHire.position) {
            newSalary = getPositionSalary(selectedHire.position);
            newRoleClass = getRoleClass(selectedHire.position);
            newEmployeeId = getNextEmployeeId(selectedHire.position, employees);
          }
          
          // Get benefits package based on role class
          const benefitsPackage = getBenefitsPackage(newRoleClass);

          // Update form with new hire data
          setFormData({
            firstName: selectedHire.firstName,
            middleName: selectedHire.middleName || '', // Include middle name from new hire
            lastName: selectedHire.lastName,
            email: selectedHire.email || '',
            phoneNumber: selectedHire.phoneNumber || '',
            hireDate: selectedHire.hireDate,
            department: selectedHire.department || '',
            position: selectedHire.position || '',
            employeeId: newEmployeeId,
            salary: newSalary,
            role: newRoleClass,
            roleClass: newRoleClass,
            status: "Active",
            gender: selectedHire.gender || '', // Include gender from new hire
            nationality: selectedHire.nationality || '', // Include nationality from new hire
            address: selectedHire.address || '', // Include address from new hire
            benefits_package: benefitsPackage.package,
            benefits_amount_remaining: benefitsPackage.amount
          });

          // Mark that we're using new hire data
          setUsingNewHireData(true);
        }
      } else {
        // Reset form if "Select a New Hire" is chosen
        resetForm();
        setUsingNewHireData(false);
      }
    } else if (name === 'role') {
      // When role changes, update benefits package accordingly
      const roleClass = value;
      const benefitsPackage = getBenefitsPackage(roleClass);
      
      setFormData(prev => ({
        ...prev,
        role: roleClass,
        roleClass: roleClass,
        benefits_package: benefitsPackage.package,
        benefits_amount_remaining: benefitsPackage.amount
      }));
    } else if (name === 'benefits_package') {
      // Handle benefits package selection
      const packageAmount = value === 'Package A' ? 100000 : value === 'Package B' ? 200000 : 0;
      
      setFormData(prev => ({
        ...prev,
        benefits_package: value,
        benefits_amount_remaining: packageAmount
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'salary' ? parseFloat(value) || 0 : value
      }));
    }
  };

  // API calls
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    // Validate phone number
    if (!isValidPhoneNumber(formData.phoneNumber)) {
      setErrorMessage('Phone number must start with 09 and be 11 digits long');
      return;
    }

    // Prepare data for API - ensure roleClass is properly passed
    const apiData = {
      ...formData,
      role_class: formData.roleClass // Make sure this matches your API expectations
    };

    try {
      const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Employee ${formData.firstName} ${formData.lastName} added successfully`);

        // If this was from a new hire, delete the new hire record
        if (selectedNewHireId) {
          await fetch(`/api/admin/new-hires?id=${selectedNewHireId}`, {
            method: 'DELETE'
          });
          fetchNewHires();
        }

        setShowAddModal(false);
        resetForm();
        fetchEmployees();
      } else {
        setErrorMessage(data.error || 'Failed to add employee');
      }
    } catch (error) {
      console.error("Error adding employee:", error);
      setErrorMessage('Error connecting to server');
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!currentEmployee) return;

    // Validate phone number
    if (!isValidPhoneNumber(formData.phoneNumber)) {
      setErrorMessage('Phone number must start with 09 and be 11 digits long');
      return;
    }

    // Prepare data for API - ensure roleClass is properly passed
    const apiData = {
      ...formData,
      role_class: formData.roleClass // Make sure this matches your API expectations
    };

    try {
      const response = await fetch(`/api/admin/employees?id=${currentEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Employee ${formData.firstName} ${formData.lastName} updated successfully`);
        setShowEditModal(false);
        fetchEmployees();
      } else {
        setErrorMessage(data.error || 'Failed to update employee');
      }
    } catch (error) {
      console.error("Error updating employee:", error);
      setErrorMessage('Error connecting to server');
    }
  };

  const handleDeleteEmployee = async () => {
    clearMessages();

    if (!currentEmployee) return;

    try {
      const response = await fetch(`/api/admin/employees?id=${currentEmployee.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Employee ${currentEmployee.firstName} ${currentEmployee.lastName} deleted successfully`);
        setShowDeleteModal(false);
        fetchEmployees();
      } else {
        setErrorMessage(data.error || 'Failed to delete employee');
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      setErrorMessage('Error connecting to server');
    }
  };

  const openAddModal = () => {
    resetForm();
    setSelectedNewHireId("");
    setUsingNewHireData(false);
    setShowAddModal(true);
  };

  const openEditModal = (employee: Employee) => {
    setCurrentEmployee(employee);

    let formattedHireDate = '';
    if (employee.hireDate) {
      const hireDate = new Date(employee.hireDate);
      if (!isNaN(hireDate.getTime())) {
        formattedHireDate = hireDate.toISOString().split('T')[0];
      }
    }

    setFormData({
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      middleName: employee.middleName || '', // Include middle name
      lastName: employee.lastName,
      email: employee.email,
      position: employee.position,
      department: employee.department,
      status: employee.status as "Active" | "Inactive" | "On Leave",
      hireDate: formattedHireDate,
      phoneNumber: employee.phoneNumber,
      salary: employee.salary,
      role: employee.role,
      roleClass: employee.role,
      gender: employee.gender || '', // Include gender
      nationality: employee.nationality || '', // Include nationality
      address: employee.address || '', // Include address
      benefits_package: employee.benefits_package || '',
      benefits_amount_remaining: employee.benefits_amount_remaining || 0
    });

    setShowEditModal(true);
  };

  const openDeleteModal = (employee: Employee) => {
    setCurrentEmployee(employee);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      firstName: "",
      middleName: "", // Include middle name
      lastName: "",
      email: "",
      position: "",
      department: "",
      status: "Active",
      hireDate: "",
      phoneNumber: "",
      salary: 0,
      role: "",
      roleClass: "",
      gender: "", // Added gender
      nationality: "", // Added nationality
      address: "", // Added address
      benefits_package: "",
      benefits_amount_remaining: 0
    });
    setSelectedNewHireId("");
    setUsingNewHireData(false);
  };

  const clearMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Employee ID", "First Name", "Middle Name", "Last Name", "Email", "Position", "Department", "Status", "Hire Date", "Phone Number", "Salary", "Role", "Gender", "Nationality", "Address", "Benefits Package", "Benefits Amount"];
    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map(emp => [
        emp.employeeId,
        `"${emp.firstName}"`,
        `"${emp.middleName || ''}"`,
        `"${emp.lastName}"`,
        `"${emp.email}"`,
        `"${emp.position}"`,
        `"${emp.department}"`,
        emp.status,
        emp.hireDate,
        `"${emp.phoneNumber}"`,
        emp.salary,
        emp.role,
        `"${emp.gender || ''}"`,
        `"${emp.nationality || ''}"`,
        `"${emp.address || ''}"`,
        `"${emp.benefits_package || ''}"`,
        emp.benefits_amount_remaining || 0
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Management</h1>
        <p className="text-gray-600">Manage employee records, update information, and export data.</p>
      </div>

      {/* Employees Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Error/Success Messages */}
        {errorMessage && (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded" role="alert">
            <p>{successMessage}</p>
          </div>
        )}

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center">
            <button
              onClick={openAddModal}
              className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-600 transition mr-2"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </button>
            <button
              onClick={exportToCSV}
              className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-green-600 transition mr-2"
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </button>
            <button
              onClick={fetchEmployees}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center hover:bg-gray-300 transition"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search employees..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full md:w-60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>

            <select
              className="py-2 px-4 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full md:w-auto"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departmentsList.filter(d => d !== "all").map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              className="py-2 px-4 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full md:w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Employees Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredEmployees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer" onClick={() => handleSort('employeeId')}>
                    <div className="flex items-center">
                      Employee ID
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer" onClick={() => handleSort('firstName')}>
                    <div className="flex items-center">
                      Name
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Email</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer" onClick={() => handleSort('position')}>
                    <div className="flex items-center">
                      Position
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer" onClick={() => handleSort('department')}>
                    <div className="flex items-center">
                      Department
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer" onClick={() => handleSort('salary')}>
                    <div className="flex items-center">
                      Salary
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer" onClick={() => handleSort('role')}>
                    <div className="flex items-center">
                      Role
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer" onClick={() => handleSort('benefits_package')}>
                    <div className="flex items-center">
                      Benefits
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{employee.employeeId}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {employee.firstName} {employee.middleName ? employee.middleName + ' ' : ''}{employee.lastName}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{employee.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{employee.position}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{employee.department}</td>
                    <td className="py-3 px-4 text-sm">
                      {renderStatusBadge(employee.status)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">₱{employee.salary.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{employee.role}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      <div>
                        <div>{employee.benefits_package || 'None'}</div>
                        <div className="text-xs">₱{(employee.benefits_amount_remaining || 0).toLocaleString()}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(employee)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(employee)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
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
      </div>

      {/* Add New Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="px-6 py-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Add New Employee</h3>
            </div>

            <form onSubmit={handleAddEmployee} className="px-6 py-4">
              {/* New Hire Selection */}
              <div className="mb-6">
                <label htmlFor="newHireSelect" className="block text-sm font-medium text-gray-700 mb-1">Select New Hire</label>
                <select
                  id="newHireSelect"
                  name="newHireSelect"
                  value={selectedNewHireId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a New Hire</option>
                  {newHires.map((hire) => (
                    <option key={hire.id} value={hire.id}>
                      {hire.firstName} {hire.middleName ? hire.middleName + ' ' : ''}{hire.lastName} ({hire.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Position */}
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Position <span className="text-red-500">*</span></label>
                  {usingNewHireData ? (
                    // When using new hire data, show as read-only input
                    <input
                      type="text"
                      id="position"
                      name="position"
                      value={formData.position}
                      readOnly
                      className="w-full bg-gray-100 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                    />
                  ) : (
                    // When not using new hire data, show as dropdown
                    <select
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Position</option>
                      {positions
                        .filter(p => !['President', 'Vice President'].includes(p.name))
                        .map(position => (
                          <option key={position.id} value={position.id}>{position.name}</option>
                        ))}
                    </select>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">Department <span className="text-red-500">*</span></label>
                  {usingNewHireData ? (
                    // When using new hire data, show as read-only input
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      readOnly
                      className="w-full bg-gray-100 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                    />
                  ) : (
                    // When not using new hire data, show as dropdown
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                
                {/* Benefits Package - NEW FIELD */}
                <div>
                  <label htmlFor="benefits_package" className="block text-sm font-medium text-gray-700 mb-1">Benefits Package <span className="text-red-500">*</span></label>
                  <select
                    id="benefits_package"
                    name="benefits_package"
                    value={formData.benefits_package}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Benefits Package</option>
                    <option value="Package A">Package A (₱100,000)</option>
                    <option value="Package B">Package B (₱200,000)</option>
                  </select>
                </div>
                
                {/* Benefits Amount - Read Only */}
                <div>
                  <label htmlFor="benefits_amount_remaining" className="block text-sm font-medium text-gray-700 mb-1">Benefits Amount (₱)</label>
                  <input
                    type="text"
                    id="benefits_amount_remaining"
                    name="benefits_amount_remaining"
                    value={formData.benefits_amount_remaining.toLocaleString()}
                    readOnly
                    disabled
                    className="w-full bg-gray-100 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Auto-set based on benefits package</p>
                </div>

                {/* Employee ID - Read Only */}
                <div>
                  <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    readOnly
                    disabled
                    className="w-full bg-gray-100 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Auto-generated based on position</p>
                </div>

                {/* Salary - Read Only */}
                <div>
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">Salary (₱)</label>
                  <input
                    type="text"
                    id="salary"
                    name="salary"
                    value={formData.salary.toLocaleString()}
                    readOnly
                    disabled
                    className="w-full bg-gray-100 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Auto-set based on position</p>
                </div>

                {/* First Name - Read Only if new hire is selected */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    readOnly={usingNewHireData}
                    className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                  />
                </div>

                {/* Middle Name */}
                <div>
                  <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    id="middleName"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    readOnly={usingNewHireData}
                    className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                  />
                </div>

                {/* Last Name - Read Only if new hire is selected */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    readOnly={usingNewHireData}
                    className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                  />
                </div>

                {/* Email - Read Only if new hire is selected */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    readOnly={usingNewHireData}
                    className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                  />
                </div>

                {/* Phone Number - Read Only if new hire is selected */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span> <span className="text-xs text-gray-500">(must start with 09, 11 digits)</span>
                  </label>
                  {usingNewHireData ? (
                    <input
                      type="text"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      readOnly
                      className="w-full bg-gray-100 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                    />
                  ) : (
                    <>
                      <input
                        type="text"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handlePhoneNumberChange}
                        required
                        placeholder="09XXXXXXXXX"
                        className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formData.phoneNumber && !isValidPhoneNumber(formData.phoneNumber) && (
                        <p className="mt-1 text-sm text-red-500">Phone number must start with 09 and be 11 digits long</p>
                      )}
                    </>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
                  {usingNewHireData ? (
                    <input
                      type="text"
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      readOnly
                      className="w-full bg-gray-100 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  )}
                </div>

                {/* Nationality */}
                <div>
                  <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">Nationality <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="nationality"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    required
                    readOnly={usingNewHireData}
                    className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    readOnly={usingNewHireData}
                    className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                </div>

                {/* Hire Date - Read Only if new hire is selected */}
                <div>
                  <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700 mb-1">Hire Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    id="hireDate"
                    name="hireDate"
                    value={formData.hireDate}
                    onChange={handleChange}
                    required
                    readOnly={usingNewHireData}
                    className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                  />
                </div>

                {/* Role Class - Read Only */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    value={formData.role}
                    readOnly
                    disabled
                    className="w-full bg-gray-100 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Auto-determined based on position</p>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  disabled={!formData.position || !formData.department}
                >
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && currentEmployee && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">Edit Employee</h3>
            </div>

            <form onSubmit={handleUpdateEmployee}>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Employee ID <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="employeeId"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      readOnly
                    />
                  </div>

                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Add Middle Name field */}
                  <div>
                    <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      id="middleName"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Position <span className="text-red-500">*</span></label>
                    <select
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Position</option>
                      {positions.map(position => (
                        <option key={position.id} value={position.id}>{position.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">Department <span className="text-red-500">*</span></label>
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Benefits Package */}
                  <div>
                    <label htmlFor="benefits_package" className="block text-sm font-medium text-gray-700 mb-1">Benefits Package <span className="text-red-500">*</span></label>
                    <select
                      id="benefits_package"
                      name="benefits_package"
                      value={formData.benefits_package}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Package</option>
                      <option value="Package A">Package A (₱100,000)</option>
                      <option value="Package B">Package B (₱200,000)</option>
                    </select>
                  </div>
                  
                  {/* Benefits Amount Remaining */}
                  <div>
                    <label htmlFor="benefits_amount_remaining" className="block text-sm font-medium text-gray-700 mb-1">
                      Benefits Amount (₱)
                    </label>
                    <input
                      type="text"
                      id="benefits_amount_remaining"
                      name="benefits_amount_remaining"
                      value={formData.benefits_amount_remaining.toLocaleString()}
                      readOnly
                      className="w-full bg-gray-100 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-sm text-gray-500">Auto-set based on package</p>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {statusOptions.map((status, i) => (
                        <option key={i} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700 mb-1">Hire Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      id="hireDate"
                      name="hireDate"
                      value={formData.hireDate}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span> <span className="text-xs text-gray-500">(must start with 09, 11 digits)</span>
                    </label>
                    <input
                      type="text"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handlePhoneNumberChange}
                      required
                      placeholder="09XXXXXXXXX"
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formData.phoneNumber && !isValidPhoneNumber(formData.phoneNumber) && (
                      <p className="mt-1 text-sm text-red-500">Phone number must start with 09 and be 11 digits long</p>
                    )}
                  </div>

                  {/* Add Gender field */}
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Add Nationality field */}
                  <div>
                    <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">Nationality <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="nationality"
                      name="nationality"
                      value={formData.nationality}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Add Address field */}
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">Salary (₱) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      id="salary"
                      name="salary"
                      value={formData.salary}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Role Class</option>
                      <option value="Class A">Class A</option>
                      <option value="Class B">Class B</option>
                      <option value="Class C">Class C</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Update Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Confirm Delete</h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">Are you sure you want to delete the employee record for <strong>{currentEmployee?.firstName} {currentEmployee?.middleName ? currentEmployee.middleName + ' ' : ''}{currentEmployee?.lastName}</strong>? This action cannot be undone.</p>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEmployee}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}