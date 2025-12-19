// app/admin/manage-employee/AddEmployeeModal.tsx

import { useState, useEffect } from "react";
import { positions, departments, getNextEmployeeId, getPositionSalary, getRoleClass } from "../../utils/positionData";

// Updated NewHire interface with the new fields
interface NewHire {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  gender?: string;
  nationality?: string;
  address?: string; // New field
  phoneNumber: string;
  department?: string; // New field
  position?: string; // New field
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
    roleClass: "",
    gender: "",
    nationality: "",
    address: "",
    benefits_package: "", // Added benefits package field
    benefits_amount_remaining: 0 // Added benefits amount field
  });

  // State to track if we're using new hire data
  const [usingNewHireData, setUsingNewHireData] = useState(false);

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
        roleClass: "",
        gender: "",
        nationality: "",
        address: "",
        benefits_package: "",
        benefits_amount_remaining: 0
      });
      setSelectedNewHireId("");
      setUsingNewHireData(false);
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

  // Helper to determine benefits package based on role class
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

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for position change - only applicable when not using new hire data
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
        role: roleClass,  // Use the roleClass directly as the role
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
          // Format the hire date for the date input
          const formattedHireDate = formatDateForInput(selectedHire.hireDate);
          
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
            lastName: selectedHire.lastName,
            email: selectedHire.email || '',
            phoneNumber: selectedHire.phoneNumber || '',
            hireDate: formattedHireDate,
            department: selectedHire.department || '',
            position: selectedHire.position || '',
            employeeId: newEmployeeId,
            salary: newSalary,
            role: newRoleClass,
            roleClass: newRoleClass,
            status: "Active",
            gender: selectedHire.gender || '',
            nationality: selectedHire.nationality || '',
            address: selectedHire.address || '',
            benefits_package: benefitsPackage.package,
            benefits_amount_remaining: benefitsPackage.amount
          });
          
          // Mark that we're using new hire data
          setUsingNewHireData(true);
        }
      } else {
        // Reset form if "Select a New Hire" is chosen
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
          roleClass: "",
          gender: "",
          nationality: "",
          address: "",
          benefits_package: "",
          benefits_amount_remaining: 0
        });
        setUsingNewHireData(false);
      }
    } else if (name === 'benefits_package') {
      // Handle benefits package selection
      const packageAmount = value === 'Package A' ? 100000 : value === 'Package B' ? 200000 : 0;
      
      setFormData(prev => ({
        ...prev,
        benefits_package: value,
        benefits_amount_remaining: packageAmount
      }));
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
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'salary' ? parseFloat(value) || 0 : value
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    return !!(
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.position &&
      formData.department &&
      formData.hireDate &&
      formData.phoneNumber &&
      formData.gender &&
      formData.nationality &&
      formData.address &&
      formData.benefits_package
    );
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert("Please fill all required fields");
      return;
    }
    
    // Include selected new hire ID in the form data for reference
    onSubmit({ 
      ...formData, 
      newHireId: selectedNewHireId
    });
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
            
            {/* First Name */}
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
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            {/* Last Name */}
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
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            {/* Email */}
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
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span> <span className="text-xs text-gray-500">(must start with 09, 11 digits)</span>
              </label>
              <input
                type="text"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                readOnly={usingNewHireData}
                placeholder="09XXXXXXXXX"
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
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
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
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
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            {/* Hire Date */}
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
                className={`w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  usingNewHireData ? 'bg-gray-100 cursor-not-allowed' : ''
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
              disabled={!validateForm()}
            >
              Add Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}