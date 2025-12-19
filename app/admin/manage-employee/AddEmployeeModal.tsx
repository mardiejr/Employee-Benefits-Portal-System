// app/admin/manage-employee/AddEmployeeModal.tsx

import { useState, useEffect } from "react";
import { positions, departments, getNextEmployeeId, getPositionSalary, getRoleClass } from "../../utils/positionData";

interface NewHire {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  gender?: string;
  nationality?: string;
  phoneNumber: string;
  hireDate: string;
}

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  newHires: NewHire[];
  employees: any[];
}

export default function AddEmployeeModal({ isOpen, onClose, onSubmit, newHires, employees }: AddEmployeeModalProps) {
  const [selectedNewHireId, setSelectedNewHireId] = useState<number | "">(""); 
  
  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    department: "",
    status: "Active" as "Active" | "Inactive" | "On Leave",
    hireDate: "",
    phoneNumber: "",
    salary: 0,
    role: "",
    roleClass: ""
  });

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setFormData({
        employeeId: "",
        firstName: "",
        lastName: "",
        email: "",
        position: "",
        department: "",
        status: "Active",
        hireDate: "",
        phoneNumber: "",
        salary: 0,
        role: "",
        roleClass: ""
      });
      setSelectedNewHireId("");
    }
  }, [isOpen]);

  // Helper function to format dates correctly for the date input
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return "";
    
    try {
      // Handle various date formats
      let date;
      
      if (dateString.includes('T')) {
        // ISO format (YYYY-MM-DDTHH:mm:ss...)
        date = new Date(dateString);
      } else if (dateString.includes('/')) {
        // MM/DD/YYYY format
        const parts = dateString.split('/');
        date = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
      } else {
        // Assume YYYY-MM-DD format
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateString);
        return "";
      }
      
      // Format to YYYY-MM-DD for date input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for position change
    if (name === 'position') {
      // Get the position's default salary
      const salary = getPositionSalary(value);
      
      // Auto-generate employee ID based on position
      const employeeId = getNextEmployeeId(value, employees);

      // Get role class based on position
      const roleClass = getRoleClass(value);
      
      // Update form with new values
      setFormData(prev => ({
        ...prev,
        position: value,
        salary: salary,
        employeeId: employeeId,
        role: roleClass,  // Use the roleClass directly as the role
        roleClass: roleClass
      }));
    } else if (name === "newHireSelect") {
      // Handle new hire selection
      const newHireId = parseInt(value);
      setSelectedNewHireId(newHireId);
      
      if (newHireId) {
        const selectedHire = newHires.find(hire => hire.id === newHireId);
        if (selectedHire) {
          // Format the hire date for the date input
          const formattedHireDate = formatDateForInput(selectedHire.hireDate);
          console.log("Original hire date:", selectedHire.hireDate);
          console.log("Formatted hire date:", formattedHireDate);
          
          setFormData(prev => ({
            ...prev,
            firstName: selectedHire.firstName,
            lastName: selectedHire.lastName,
            email: selectedHire.email || '',
            phoneNumber: selectedHire.phoneNumber || '',
            hireDate: formattedHireDate
          }));
        }
      } else {
        // Reset personal info if "Select a New Hire" is chosen
        setFormData(prev => ({
          ...prev,
          firstName: "",
          lastName: "",
          email: "",
          phoneNumber: "",
          hireDate: ""
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'salary' ? parseFloat(value) || 0 : value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Include selected new hire ID in the form data for reference
    onSubmit({ ...formData, newHireId: selectedNewHireId });
  };

  // If modal is closed, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="px-6 py-4 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Add New Employee</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4">
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
                  {hire.firstName} {hire.lastName} ({hire.email})
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Position - Top */}
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Position</label>
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
            </div>
            
            {/* Department - Top */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
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
            
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                readOnly={!!selectedNewHireId}
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  selectedNewHireId ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                readOnly={!!selectedNewHireId}
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  selectedNewHireId ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                readOnly={!!selectedNewHireId}
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  selectedNewHireId ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                readOnly={!!selectedNewHireId}
                placeholder="e.g., +639171234567"
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  selectedNewHireId ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            {/* Hire Date */}
            <div>
              <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
              <input
                type="date"
                id="hireDate"
                name="hireDate"
                value={formData.hireDate}
                onChange={handleChange}
                required
                readOnly={!!selectedNewHireId}
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  selectedNewHireId ? 'bg-gray-100 cursor-not-allowed' : ''
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
              onClick={onClose}
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
  );
}