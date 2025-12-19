"use client";
import { useState, ChangeEvent, FormEvent, useRef, useEffect } from 'react';
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
  email: string;
  monthlySalary: string;
  lengthOfService: string;

  propertyType: string;
  propertyAddress: string;
  propertyValue: string;
  sellerName: string;
  sellerContact: string;

  loanAmountRequested: string;
  repaymentTerm: string;

  comakerDocument: File | null;
  propertyDocuments: File | null;

  isVerified: boolean;
}

export default function HousingLoanPage() {
  const { handleApiError } = useAuth();
  const { userProfile, isApprover, loading } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [maxLoanAmount, setMaxLoanAmount] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    employeeId: '',
    position: '',
    contactNumber: '',
    email: '',
    monthlySalary: '',
    lengthOfService: '',
    propertyType: '',
    propertyAddress: '',
    propertyValue: '',
    sellerName: '',
    sellerContact: '',
    loanAmountRequested: '',
    repaymentTerm: '',
    comakerDocument: null,
    propertyDocuments: null,
    isVerified: false
  });

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        const currentYear = new Date().getFullYear();
        const hireYear = new Date(data.hire_date).getFullYear();
        const yearsOfService = currentYear - hireYear;

        const salary = parseFloat(data.salary);
        const maxLoan = salary * 30;
        setMaxLoanAmount(maxLoan);

        setFormData(prev => ({
          ...prev,
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          employeeId: data.employee_id || '',
          position: data.position || '',
          contactNumber: data.phone_number || '',
          email: data.email || '',
          monthlySalary: salary.toString(),
          lengthOfService: yearsOfService.toString()
        }));
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSellerContactChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 11) {
      setFormData(prev => ({ ...prev, sellerContact: value }));
    }
  };

  const handlePropertyValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, propertyValue: value }));
  };

  const handleLoanAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, loanAmountRequested: value }));
  };

  const isLoanAmountValid = () => {
    const amount = parseInt(formData.loanAmountRequested);
    return !isNaN(amount) && amount >= 10000 && amount <= maxLoanAmount;
  };

  const handleSellerNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setFormData(prev => ({ ...prev, sellerName: value }));
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, fileType: keyof FormData) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      [fileType]: file
    }));
  };

  const validateStep1 = (): boolean => {
    // No need to validate contact number as it's auto-filled
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.propertyType) {
      alert('Please select a property type');
      return false;
    }
    if (!formData.propertyAddress.trim()) {
      alert('Please enter the property address');
      return false;
    }
    if (!formData.propertyValue) {
      alert('Please enter the property value');
      return false;
    }
    if (!formData.sellerName.trim()) {
      alert('Please enter the seller/developer name');
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(formData.sellerName)) {
      alert('Seller name must contain only letters');
      return false;
    }
    if (!formData.sellerContact) {
      alert('Please enter the seller contact number');
      return false;
    }
    if (!/^09\d{9}$/.test(formData.sellerContact)) {
      alert('Seller contact number must start with 09 and be exactly 11 digits');
      return false;
    }
    if (!formData.loanAmountRequested) {
      alert('Please enter the loan amount requested');
      return false;
    }

    const loanAmount = parseFloat(formData.loanAmountRequested);
    if (loanAmount < 10000) {
      alert('Loan amount must be at least ₱10,000');
      return false;
    }

    if (loanAmount > maxLoanAmount) {
      alert(`Loan amount cannot exceed ₱${maxLoanAmount.toLocaleString()} (30x your monthly salary)`);
      return false;
    }

    if (!formData.repaymentTerm) {
      alert('Please select a repayment term');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!formData.comakerDocument) {
      alert('Please attach a co-maker document');
      return false;
    }
    if (!formData.propertyDocuments) {
      alert('Please attach property documents');
      return false;
    }
    if (!formData.isVerified) {
      alert('Please check the verification box to proceed');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateStep3()) {
      return;
    }

    const submitFormData = new FormData();
    submitFormData.append('firstName', formData.firstName);
    submitFormData.append('lastName', formData.lastName);
    submitFormData.append('employeeId', formData.employeeId);
    submitFormData.append('position', formData.position);
    submitFormData.append('contactNumber', formData.contactNumber);
    submitFormData.append('email', formData.email);
    submitFormData.append('monthlySalary', formData.monthlySalary);
    submitFormData.append('lengthOfService', formData.lengthOfService);
    submitFormData.append('propertyType', formData.propertyType);
    submitFormData.append('propertyAddress', formData.propertyAddress);
    submitFormData.append('propertyValue', formData.propertyValue);
    submitFormData.append('sellerName', formData.sellerName);
    submitFormData.append('sellerContact', formData.sellerContact);
    submitFormData.append('loanAmountRequested', formData.loanAmountRequested);
    submitFormData.append('repaymentTerm', formData.repaymentTerm);

    if (formData.comakerDocument) submitFormData.append('comakerDocument', formData.comakerDocument);
    if (formData.propertyDocuments) submitFormData.append('propertyDocumentsFile', formData.propertyDocuments);

    try {
      const response = await fetch('/api/loan/housing-loan/submit', {
        method: 'POST',
        body: submitFormData,
      });

      const result = await response.json();

      if (response.ok) {
        alert('Housing loan application submitted successfully!');
        window.location.href = '/status';
      } else {
        alert(result.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred while submitting the application');
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeNavbar isApprover={isApprover} />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <a href="/benefits" className="hover:text-blue-600">
                My Benefits
              </a>
            </li>
            <li>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <a href="/loan" className="hover:text-blue-600">
                Loan
              </a>
            </li>
            <li>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li className="text-gray-900">Housing Loan</li>
          </ol>
        </nav>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Housing Loan Process</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="text-blue-600 font-semibold mr-2">1.</span>
              <span>Submit application form with property details</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 font-semibold mr-2">2.</span>
              <span>HR and management review and approve</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 font-semibold mr-2">3.</span>
              <span>Property verification and document validation</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 font-semibold mr-2">4.</span>
              <span>Loan disbursement and property transfer</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Housing Loan Application</h2>
          <p className="text-sm text-gray-600 mb-4">
            For any concerns or questions regarding your housing loan, you may reach out 24/7 Call Center at
            8-582-1818 (Metro Manila) or 1-800-10-InLife (domestic toll-free) or via email at <span className="text-blue-600">customercare@insular.com.ph</span>
          </p>
          <p className="text-xs text-gray-500 mb-6">Today&apos;s Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                1
              </div>
              <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                2
              </div>
              <div className={`w-16 h-1 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                3
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    disabled
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                    <input
                      type="text"
                      name="contactNumber"
                      value={formData.contactNumber}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Salary</label>
                    <input
                      type="text"
                      name="monthlySalary"
                      value={`₱${parseFloat(formData.monthlySalary).toLocaleString()}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Length of Service</label>
                    <input
                      type="text"
                      name="lengthOfService"
                      value={`${formData.lengthOfService} Years`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Property Information</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Property Type</option>
                    <option value="house-and-lot">House and Lot</option>
                    <option value="condominium">Condominium</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="lot-only">Lot Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Address *</label>
                  <textarea
                    name="propertyAddress"
                    placeholder="Complete property address"
                    value={formData.propertyAddress}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Value *</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-100 text-gray-700 rounded-l-md">
                      ₱
                    </span>
                    <input
                      type="text"
                      name="propertyValue"
                      placeholder="0"
                      value={formData.propertyValue}
                      onChange={handlePropertyValueChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seller/Developer Name *</label>
                    <input
                      type="text"
                      name="sellerName"
                      placeholder="Name of seller or developer"
                      value={formData.sellerName}
                      onChange={handleSellerNameChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {formData.sellerName && !/^[a-zA-Z\s]+$/.test(formData.sellerName) && (
                      <p className="text-xs text-red-600 mt-1">Only letters are allowed</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seller Contact Number *</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-100 text-gray-700 rounded-l-md">
                        +63
                      </span>
                      <input
                        type="text"
                        name="sellerContact"
                        placeholder="09XXXXXXXXX"
                        value={formData.sellerContact}
                        onChange={handleSellerContactChange}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    {formData.sellerContact && !/^09\d{9}$/.test(formData.sellerContact) && (
                      <p className="text-xs text-red-600 mt-1">Must start with 09 and be exactly 11 digits</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loan Amount Requested * <span className="text-xs text-gray-500">(Min: ₱10,000 | Max: ₱{maxLoanAmount.toLocaleString()})</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-100 text-gray-700 rounded-l-md">
                      ₱
                    </span>
                    <input
                      type="text"
                      name="loanAmountRequested"
                      placeholder="0"
                      value={formData.loanAmountRequested}
                      onChange={handleLoanAmountChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {formData.loanAmountRequested && (
                    <>
                      {parseFloat(formData.loanAmountRequested) > maxLoanAmount && (
                        <p className="text-xs text-red-600 mt-1">Loan amount exceeds maximum allowed (30x monthly salary)</p>
                      )}
                      {parseFloat(formData.loanAmountRequested) < 10000 && (
                        <p className="text-xs text-red-600 mt-1">Minimum loan amount is ₱10,000</p>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Repayment Term *</label>
                  <select
                    name="repaymentTerm"
                    value={formData.repaymentTerm}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Repayment Term</option>
                    <option value="60 months">60 months</option>
                    <option value="120 months">120 months</option>
                    <option value="180 months">180 months</option>
                    <option value="240 months">240 months</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Required Documents</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Co-maker Document *
                    <span className="block text-xs text-gray-500">Upload a document signed by an employee with at least 1 year tenure who agrees to co-sign your loan</span>
                  </label>
                  <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center bg-purple-50">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600">Drop file here or</p>
                      <label htmlFor="comaker-upload" className="text-blue-600 underline cursor-pointer">
                        click to browse
                      </label>
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, 'comakerDocument')}
                        className="hidden"
                        accept=".png,.jpg,.jpeg,.pdf"
                        id="comaker-upload"
                      />
                      {formData.comakerDocument && (
                        <p className="text-sm text-green-600 mt-2">✓ {formData.comakerDocument.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attach Property Documents (Title, Tax Declaration, etc.) *
                  </label>
                  <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center bg-purple-50">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600">Drop file here or</p>
                      <label htmlFor="property-docs-upload" className="text-blue-600 underline cursor-pointer">
                        click to browse
                      </label>
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, 'propertyDocuments')}
                        className="hidden"
                        accept=".png,.jpg,.jpeg,.pdf"
                        id="property-docs-upload"
                      />
                      {formData.propertyDocuments && (
                        <p className="text-sm text-green-600 mt-2">✓ {formData.propertyDocuments.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="isVerified"
                    checked={formData.isVerified}
                    onChange={handleInputChange}
                    className="mt-1 mr-2"
                    required
                  />
                  <label className="text-sm text-gray-700">
                    I certify that the information provided is true and correct. I understand that this application will be subject to approval by the company president and verification by the property administrator.
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Previous
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="ml-auto px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Submit Housing Loan Request
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}