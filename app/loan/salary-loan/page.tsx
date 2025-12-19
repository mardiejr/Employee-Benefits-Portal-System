"use client";
import { useState, ChangeEvent, FormEvent, useRef, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoutButton from "../../components/LogoutButton";
import useAuth from "../../hooks/useAuth";
import EmployeeNavbar from "../../components/EmployeeNavbar";
import useUserProfile from "../../hooks/useUserProfile";

interface FormData {
  firstName: string;
  lastName: string;
  employeeId: string;
  position: string;
  contactNumber: string;
  loanAmount: string;
  loanPurpose: string;
  repaymentTerm: string;
  monthlySalary: string;
  comakerFile: File | null;
  isVerified: boolean;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  position?: string;
  contactNumber?: string;
  loanAmount?: string;
  loanPurpose?: string;
  repaymentTerm?: string;
  comakerFile?: string;
  isVerified?: string;
}

interface UserProfile {
  employee_id: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  salary: number;
  hire_date: string;
  role_class: string;
  phone_number: string;
}

export default function SalaryLoanPage() {
  const { handleApiError } = useAuth();
  const { isApprover } = useUserProfile();
  const [showForm, setShowForm] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxLoanAmount, setMaxLoanAmount] = useState(0);
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    employeeId: '',
    position: '',
    contactNumber: '',
    loanAmount: '',
    loanPurpose: '',
    repaymentTerm: '',
    monthlySalary: '',
    comakerFile: null,
    isVerified: false
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const response = await fetch('/api/user/profile');

        if (response.status === 401) {
          console.log('Unauthorized - redirecting to login');
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        console.log('Fetched user profile:', data);
        setUserProfile(data);

        // Auto-fill form fields with database values
        setFormData(prev => ({
          ...prev,
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          employeeId: data.employee_id || '',
          position: `${data.department} - ${data.position}` || '',
          contactNumber: data.phone_number || '',
          monthlySalary: data.salary ? `₱${data.salary.toLocaleString()}` : '₱0'
        }));

        console.log('Max loan calculation inputs:', {
          hire_date: data.hire_date,
          salary: data.salary,
          role_class: data.role_class
        });

        // Calculate max loan amount based on hire date, salary, and role class
        calculateMaxLoan(data.hire_date, data.salary, data.role_class);

      } catch (err) {
        console.error('Error fetching profile:', err);
        alert('Failed to load user profile. Please try logging in again.');
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [router]);

  // Calculate maximum loan amount based on years of service and role class
  const calculateMaxLoan = (hireDate: string, salary: number, roleClass: string) => {
    const yearsOfService = getYearsOfService(hireDate);

    // All classes (A, B, C) follow the same rule:
    // 5+ years: 2x monthly salary
    // < 5 years: 1x monthly salary
    const multiplier = yearsOfService >= 5 ? 2 : 1;
    const maxAmount = salary * multiplier;

    setMaxLoanAmount(maxAmount);
  };

  // Get years of service
  const getYearsOfService = (hireDate: string): number => {
    const hire = new Date(hireDate);
    const today = new Date();
    const years = today.getFullYear() - hire.getFullYear();
    const monthDiff = today.getMonth() - hire.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hire.getDate())) {
      return years - 1;
    }
    return years;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let newValue = value;
    let error = '';

    if (name === 'loanAmount') {
      // Remove ₱ symbol and commas for processing
      let amount = value.replace('₱', '').replace(/,/g, '');

      // Only allow digits
      amount = amount.replace(/\D/g, '');

      // Format with commas and ₱ symbol
      if (amount) {
        const numAmount = parseInt(amount);

        // Check if amount is less than minimum
        if (numAmount < 10000) {
          error = 'Minimum loan amount is ₱10,000';
        }
        // Check if exceeds max loan amount
        else if (numAmount > maxLoanAmount) {
          error = `Maximum loan amount is ₱${maxLoanAmount.toLocaleString()}`;
        }

        newValue = '₱' + numAmount.toLocaleString();
      } else {
        newValue = '';
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : newValue
    }));

    // Update errors
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      comakerFile: file
    }));

    // Clear error for this file
    setErrors(prev => ({
      ...prev,
      comakerFile: undefined
    }));
  };

  // Add isLoanAmountValid function
  const isLoanAmountValid = () => {
    const amount = parseInt(formData.loanAmount.replace('₱', '').replace(/,/g, ''));
    return !isNaN(amount) && amount >= 10000 && amount <= maxLoanAmount;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const loanAmount = formData.loanAmount.replace('₱', '').replace(/,/g, '');
    if (!loanAmount || parseInt(loanAmount) === 0) {
      newErrors.loanAmount = 'Loan amount is required';
    } else if (!isLoanAmountValid()) {
      if (parseInt(loanAmount) < 10000) {
        newErrors.loanAmount = 'Minimum loan amount is ₱10,000';
      } else if (parseInt(loanAmount) > maxLoanAmount) {
        newErrors.loanAmount = `Maximum loan amount is ₱${maxLoanAmount.toLocaleString()}`;
      }
    }

    if (!formData.loanPurpose) {
      newErrors.loanPurpose = 'Loan purpose is required';
    }

    if (!formData.repaymentTerm) {
      newErrors.repaymentTerm = 'Repayment term must be selected';
    }

    if (!formData.comakerFile) {
      newErrors.comakerFile = 'Co-maker document is required';
    }

    if (!formData.isVerified) {
      newErrors.isVerified = 'You must certify the information is correct';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('Please fill in all required fields correctly.');
      return;
    }

    // Check if loan amount is valid
    if (!isLoanAmountValid()) {
      const loanAmount = parseInt(formData.loanAmount.replace('₱', '').replace(/,/g, ''));
      if (loanAmount < 10000) {
        alert('Loan amount must be at least ₱10,000');
      } else {
        alert(`Loan amount cannot exceed ₱${maxLoanAmount.toLocaleString()}`);
      }
      return;
    }

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('employeeId', formData.employeeId);
      submitData.append('position', formData.position);
      submitData.append('contactNumber', formData.contactNumber);
      submitData.append('loanAmount', formData.loanAmount.replace('₱', '').replace(/,/g, ''));
      submitData.append('loanPurpose', formData.loanPurpose);
      submitData.append('repaymentTerm', formData.repaymentTerm);
      submitData.append('monthlySalary', userProfile?.salary.toString() || '0');

      if (formData.comakerFile) {
        submitData.append('comakerFile', formData.comakerFile);
      }

      const response = await fetch('/api/loan/salary-loan/submit', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit loan application');
      }

      alert('Salary loan request submitted successfully!');
      router.push('/status'); // Changed from '/loan' to '/status'

    } catch (error) {
      console.error('Error submitting loan:', error);
      alert('Failed to submit loan application. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EmployeeNavbar isApprover={isApprover} />
        <Head>
          <title>Salary Loan | InLife</title>
          <meta name="description" content="Submit your salary loan application" />
        </Head>

        {/* Form Content */}
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <nav className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <Link href="/benefits" className="hover:text-blue-600">
                  My Benefits
                </Link>
              </li>
              <li>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li>
                <Link href="/loan" className="hover:text-blue-600">
                  Loan
                </Link>
              </li>
              <li>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li className="text-gray-900">Salary Loan</li>
            </ol>
          </nav>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Salary Loan</h2>
            <p className="text-sm text-gray-600 mb-4">
              For any concerns or questions regarding your salary loan, you may reach out 24/7 Call Center at
              8-582-1818 (Metro Manila) or 1-800-10-InLife (domestic toll-free) or as well as via email at <span className="text-blue-600">customercare@insular.com.ph</span>
            </p>
            <p className="text-xs text-gray-500 mb-2">Today's Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            {userProfile && (
              <div className="mb-6">
                <p className="text-sm font-medium text-blue-600">
                  Maximum Loan Amount: ₱{maxLoanAmount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {userProfile.role_class} • {getYearsOfService(userProfile.hire_date) >= 5 ? '5+ years of service (2x monthly salary)' : 'Less than 5 years of service (1x monthly salary)'}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed focus:outline-none"
                  />
                </div>
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                <input
                  type="text"
                  name="employeeId"
                  placeholder="Type your Employee ID"
                  value={formData.employeeId}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed focus:outline-none"
                />
              </div>

              {/* Department Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department Position</label>
                <input
                  type="text"
                  name="position"
                  placeholder="Type your Department Position"
                  value={formData.position}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed focus:outline-none"
                />
              </div>

              {/* Contact Number - Now auto-filled */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                <input
                  type="text"
                  name="contactNumber"
                  placeholder="Contact Number"
                  value={formData.contactNumber}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed focus:outline-none"
                />
              </div>

              {/* Loan Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Amount Requested * <span className="text-xs text-gray-500">(Min: ₱10,000 | Max: ₱{maxLoanAmount.toLocaleString()})</span>
                </label>
                <input
                  type="text"
                  name="loanAmount"
                  placeholder="₱0"
                  value={formData.loanAmount}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.loanAmount ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.loanAmount && <p className="text-red-500 text-xs mt-1">{errors.loanAmount}</p>}
                {formData.loanAmount && !errors.loanAmount && (
                  <>
                    {parseInt(formData.loanAmount.replace('₱', '').replace(/,/g, '')) < 10000 && (
                      <p className="text-red-500 text-xs mt-1">Minimum loan amount is ₱10,000</p>
                    )}
                  </>
                )}
              </div>

              {/* Loan Purpose as dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Purpose *</label>
                <select
                  name="loanPurpose"
                  value={formData.loanPurpose}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.loanPurpose ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Loan Purpose</option>
                  <option value="Personal Use">Personal Use</option>
                  <option value="House Improvement">House Improvement</option>
                  <option value="Medical Expenses">Medical Expenses</option>
                  <option value="Education">Education</option>
                  <option value="Travel">Travel</option>
                  <option value="Debt Consolidation">Debt Consolidation</option>
                  <option value="Emergency Expenses">Emergency Expenses</option>
                  <option value="Others">Others</option>
                </select>
                {errors.loanPurpose && <p className="text-red-500 text-xs mt-1">{errors.loanPurpose}</p>}
              </div>

              {/* Repayment Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Repayment Term *</label>
                <select
                  name="repaymentTerm"
                  value={formData.repaymentTerm}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.repaymentTerm ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Repayment Term</option>
                  <option value="3 months">3 Months</option>
                  <option value="6 months">6 Months</option>
                  <option value="9 months">9 Months</option>
                </select>
                {errors.repaymentTerm && <p className="text-red-500 text-xs mt-1">{errors.repaymentTerm}</p>}
              </div>

              {/* Monthly Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Salary</label>
                <input
                  type="text"
                  name="monthlySalary"
                  value={formData.monthlySalary}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed focus:outline-none"
                />
              </div>

              {/* File Upload - Now Co-maker Document Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Co-maker Document *
                </label>
                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${errors.comakerFile ? 'border-red-300 bg-red-50' : 'border-purple-300 bg-purple-50'}`}>
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-600">Drop co-maker document here or</p>
                    <label htmlFor="comaker-upload" className="text-blue-600 underline cursor-pointer">
                      click to browse
                    </label>
                    {formData.comakerFile && (
                      <p className="text-green-600 text-sm mt-2">✓ {formData.comakerFile.name}</p>
                    )}
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".png,.jpg,.jpeg,.pdf"
                      id="comaker-upload"
                    />
                  </div>
                </div>
                {errors.comakerFile && <p className="text-red-500 text-xs mt-1">{errors.comakerFile}</p>}
                <p className="text-xs text-gray-500 mt-1">Upload signed co-maker document. Acceptable formats: JPG, PNG, PDF.</p>
              </div>

              {/* Checkbox */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="isVerified"
                  checked={formData.isVerified}
                  onChange={handleInputChange}
                  className="mt-1 mr-2"
                />
                <label className="text-sm text-gray-700">
                  I certify that the information provided is true and correct.
                </label>
              </div>
              {errors.isVerified && <p className="text-red-500 text-xs mt-1">{errors.isVerified}</p>}

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Submit Salary Loan Request
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}