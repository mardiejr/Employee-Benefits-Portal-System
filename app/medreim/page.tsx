"use client";
import { useState, ChangeEvent, FormEvent, useRef, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuth from "../hooks/useAuth";
import EmployeeNavbar from "../components/EmployeeNavbar";
import useUserProfile from "../hooks/useUserProfile";

interface FormData {
  firstName: string;
  lastName: string;
  employeeId: string;
  patientType: 'inpatient' | 'outpatient' | '';
  admissionMonth: string;
  admissionDay: string;
  admissionYear: string;
  dischargeMonth: string;
  dischargeDay: string;
  dischargeYear: string;
  totalAmount: string;
  claimMethod: 'cash' | 'salary' | '';
  medicalReceipt: File | null;
  medicalCert: File | null;
  isVerified: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  patientType?: string;
  admissionDate?: string;
  dischargeDate?: string;
  totalAmount?: string;
  claimMethod?: string;
  files?: string;
  isVerified?: string;
  benefitsLimit?: string;
}

interface UserProfile {
  employee_id: string;
  first_name: string;
  last_name: string;
  benefits_package?: string;
  benefits_amount_remaining?: number;
}

export default function MedicalReimbursementPage() {
  const { handleApiError } = useAuth();
  const { isApprover, } = useUserProfile();

  const [showForm, setShowForm] = useState<boolean>(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const medicalReceiptInputRef = useRef<HTMLInputElement>(null);
  const medicalCertInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    employeeId: '',
    patientType: '',
    admissionMonth: '',
    admissionDay: '',
    admissionYear: '',
    dischargeMonth: '',
    dischargeDay: '',
    dischargeYear: '',
    totalAmount: '',
    claimMethod: '',
    medicalReceipt: null,
    medicalCert: null,
    isVerified: false
  });

  // Fetch employee data
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const response = await fetch('/api/user/profile');

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        console.log('Fetched user profile:', data);
        setUserProfile(data);

        setFormData(prev => ({
          ...prev,
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          employeeId: data.employee_id || ''
        }));

      } catch (error) {
        console.error('Error fetching employee data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [router]);

  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    setCurrentDate(now.toLocaleDateString('en-US', options));
  }, []);

  const getDaysInMonth = (month: string, year: string): number => {
    if (!month || !year) return 31;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    return new Date(yearNum, monthNum, 0).getDate();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getRemainingBenefitsMessage = (): string => {
    if (!userProfile || !userProfile.benefits_package || userProfile.benefits_amount_remaining === undefined) {
      return "Please check with HR about your benefits package eligibility.";
    }

    const packageInfo = userProfile.benefits_package === 'Package A'
      ? { name: 'Package A', total: 100000 }
      : { name: 'Package B', total: 200000 };

    return `You have ${formatCurrency(userProfile.benefits_amount_remaining)} remaining out of ${formatCurrency(packageInfo.total)} in your ${packageInfo.name} benefits.`;
  };

  const getPackageInfo = () => {
    if (!userProfile || !userProfile.benefits_package) {
      return { name: 'No Package', total: 0, remaining: 0 };
    }

    const total = userProfile.benefits_package === 'Package A' ? 100000 : 200000;
    const remaining = userProfile.benefits_amount_remaining || 0;

    return {
      name: userProfile.benefits_package,
      total,
      remaining,
      used: total - remaining
    };
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'admissionMonth' || name === 'admissionYear') {
      const newMonth = name === 'admissionMonth' ? value : formData.admissionMonth;
      const newYear = name === 'admissionYear' ? value : formData.admissionYear;

      if (newMonth && newYear) {
        const maxDays = getDaysInMonth(newMonth, newYear);

        // Reset day if current day exceeds max days in new month
        if (formData.admissionDay && parseInt(formData.admissionDay) > maxDays) {
          setFormData(prev => ({
            ...prev,
            [name]: value,
            admissionDay: ''
          }));
          return;
        }
      }
    }

    // Handle discharge date changes
    if (name === 'dischargeMonth' || name === 'dischargeYear') {
      const newMonth = name === 'dischargeMonth' ? value : formData.dischargeMonth;
      const newYear = name === 'dischargeYear' ? value : formData.dischargeYear;

      if (newMonth && newYear) {
        const maxDays = getDaysInMonth(newMonth, newYear);

        if (formData.dischargeDay && parseInt(formData.dischargeDay) > maxDays) {
          setFormData(prev => ({
            ...prev,
            [name]: value,
            dischargeDay: ''
          }));
          return;
        }
      }
    }

    // For patient type, clear discharge date if switching to outpatient
    if (name === 'patientType' && value === 'outpatient') {
      setFormData(prev => ({
        ...prev,
        patientType: value as 'inpatient' | 'outpatient' | '',
        dischargeMonth: '',
        dischargeDay: '',
        dischargeYear: ''
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setFormData(prev => ({
      ...prev,
      totalAmount: value
    }));

    // Clear amount related errors
    if (errors.totalAmount) {
      setErrors(prev => ({ ...prev, totalAmount: undefined }));
    }
    if (errors.benefitsLimit) {
      setErrors(prev => ({ ...prev, benefitsLimit: undefined }));
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, fileType: 'medicalReceipt' | 'medicalCert') => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      [fileType]: file
    }));
    if (errors.files) {
      setErrors(prev => ({ ...prev, files: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required';
    }
    if (!formData.patientType) {
      newErrors.patientType = 'Please select patient type (In-patient or Out-patient)';
    }
    if (!formData.admissionMonth || !formData.admissionDay || !formData.admissionYear) {
      newErrors.admissionDate = 'Date of admission/consultation is required';
    } else {
      // Check if admission date is before current date
      const admissionDate = new Date(
        parseInt(formData.admissionYear),
        parseInt(formData.admissionMonth) - 1, // JavaScript months are 0-indexed
        parseInt(formData.admissionDay)
      );

      const currentDateTime = new Date();

      if (admissionDate > currentDateTime) {
        newErrors.admissionDate = 'Date of admission/consultation must be before current date and time';
      }

      // For inpatient, validate discharge date
      if (formData.patientType === 'inpatient') {
        if (!formData.dischargeMonth || !formData.dischargeDay || !formData.dischargeYear) {
          newErrors.dischargeDate = 'Date of discharge is required for in-patient claims';
        } else {
          const dischargeDate = new Date(
            parseInt(formData.dischargeYear),
            parseInt(formData.dischargeMonth) - 1,
            parseInt(formData.dischargeDay)
          );

          if (dischargeDate < admissionDate) {
            newErrors.dischargeDate = 'Discharge date must be after admission date';
          } else if (dischargeDate > currentDateTime) {
            newErrors.dischargeDate = 'Discharge date must be before current date and time';
          }
        }
      }
    }

    if (!formData.totalAmount) {
      newErrors.totalAmount = 'Total amount claimed is required';
    } else if (parseFloat(formData.totalAmount) <= 0) {
      newErrors.totalAmount = 'Total amount must be greater than 0';
    }

    // Check if amount exceeds benefits limit
    const packageInfo = getPackageInfo();
    if (userProfile?.benefits_amount_remaining !== undefined && parseFloat(formData.totalAmount) > packageInfo.remaining) {
      newErrors.benefitsLimit = `Amount exceeds your available benefits limit of ${formatCurrency(packageInfo.remaining)}`;
    }

    if (!formData.claimMethod) {
      newErrors.claimMethod = 'Please select how you would like to receive the reimbursement';
    }

    if (!formData.medicalReceipt || !formData.medicalCert) {
      newErrors.files = 'Both receipt and medical certificate are required';
    }
    if (!formData.isVerified) {
      newErrors.isVerified = 'You must certify that the information is true and correct';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('employeeId', formData.employeeId);
      formDataToSend.append('patientType', formData.patientType);
      formDataToSend.append('admissionDate', `${formData.admissionYear}-${formData.admissionMonth}-${formData.admissionDay}`);

      if (formData.patientType === 'inpatient' && formData.dischargeMonth && formData.dischargeDay && formData.dischargeYear) {
        formDataToSend.append('dischargeDate', `${formData.dischargeYear}-${formData.dischargeMonth}-${formData.dischargeDay}`);
      }

      formDataToSend.append('totalAmount', formData.totalAmount);
      formDataToSend.append('claimMethod', formData.claimMethod);

      if (formData.medicalReceipt) {
        formDataToSend.append('medicalReceipt', formData.medicalReceipt);
      }
      if (formData.medicalCert) {
        formDataToSend.append('medicalCert', formData.medicalCert);
      }

      const response = await fetch('/api/medical-reimbursement/submit', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (response.ok) {
        alert('Medical reimbursement request submitted successfully!');
        router.push('/status');
      } else {
        alert(result.error || 'Failed to submit request');
      }

    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const packageInfo = getPackageInfo();
  const percentageUsed = (packageInfo.used / packageInfo.total) * 100;

  return (
    <>
      <Head>
        <title>Medical Reimbursement - InLife Employee Portal</title>
      </Head>

      <div className="min-h-screen flex flex-col bg-slate-50">
        <EmployeeNavbar isApprover={isApprover} />

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="mb-6">
            <ol className="flex items-center space-x-2 text-sm">
              <li className="text-gray-900">My Benefits</li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-900">Medical Reimbursement</li>
            </ol>
          </nav>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Medical / Hospitalization Reimbursement Claim</h2>
            <p className="text-sm text-gray-600 mb-4">
              For any concerns or questions regarding your medical reimbursement, you may reach out 24/7 Call Center at
              8-582-1818 (Metro Manila) or 1-800-10-InLife (domestic toll-free) or as well as via email at{' '}
              <span className="text-blue-600">customercare@insular.com.ph</span>
            </p>
            <p className="text-xs text-gray-500 mb-6">Today's Date: {currentDate}</p>

            {/* Benefits Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Your Benefits Package Information</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>{packageInfo.name === 'No Package'
                      ? "You don't have an active benefits package. Please contact HR."
                      : `You have ${packageInfo.name} with a yearly limit of ${formatCurrency(packageInfo.total)}.`}
                    </p>

                    {packageInfo.name !== 'No Package' && (
                      <>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Remaining: {formatCurrency(packageInfo.remaining)}</span>
                            <span>Used: {formatCurrency(packageInfo.used)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${percentageUsed > 75 ? 'bg-red-500' : percentageUsed > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <p className="mt-2 text-xs">Benefits reset at the beginning of each year.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

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
                    onChange={handleInputChange}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed focus:outline-none"
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed focus:outline-none"
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
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
                  onChange={handleInputChange}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed focus:outline-none"
                />
                {errors.employeeId && <p className="text-red-500 text-xs mt-1">{errors.employeeId}</p>}
              </div>

              {/* Patient Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Patient Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="patientType"
                      value="outpatient"
                      checked={formData.patientType === 'outpatient'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-sm">Out-patient (Consultation)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="patientType"
                      value="inpatient"
                      checked={formData.patientType === 'inpatient'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-sm">In-patient (Hospital Confinement)</span>
                  </label>
                </div>
                {errors.patientType && <p className="text-red-500 text-xs mt-1">{errors.patientType}</p>}
              </div>

              {/* Date of Admission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.patientType === 'inpatient'
                    ? 'Date of Admission'
                    : 'Date of Consultation'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    name="admissionMonth"
                    value={formData.admissionMonth}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <select
                    name="admissionDay"
                    value={formData.admissionDay}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Day</option>
                    {Array.from({ length: getDaysInMonth(formData.admissionMonth, formData.admissionYear) }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                  <select
                    name="admissionYear"
                    value={formData.admissionYear}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={2025 - i} value={2025 - i}>{2025 - i}</option>
                    ))}
                  </select>
                </div>
                {errors.admissionDate && <p className="text-red-500 text-xs mt-1">{errors.admissionDate}</p>}
              </div>

              {/* Date of Discharge - Only show for inpatient */}
              {formData.patientType === 'inpatient' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Discharge</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      name="dischargeMonth"
                      value={formData.dischargeMonth}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Month</option>
                      <option value="01">January</option>
                      <option value="02">February</option>
                      <option value="03">March</option>
                      <option value="04">April</option>
                      <option value="05">May</option>
                      <option value="06">June</option>
                      <option value="07">July</option>
                      <option value="08">August</option>
                      <option value="09">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                    <select
                      name="dischargeDay"
                      value={formData.dischargeDay}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Day</option>
                      {Array.from({ length: getDaysInMonth(formData.dischargeMonth, formData.dischargeYear) }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                    <select
                      name="dischargeYear"
                      value={formData.dischargeYear}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Year</option>
                      {Array.from({ length: 10 }, (_, i) => (
                        <option key={2025 - i} value={2025 - i}>{2025 - i}</option>
                      ))}
                    </select>
                  </div>
                  {errors.dischargeDate && <p className="text-red-500 text-xs mt-1">{errors.dischargeDate}</p>}
                </div>
              )}

              {/* Total Amount Claimed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount Claimed</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₱</span>
                  <input
                    type="text"
                    name="totalAmount"
                    placeholder="0.00"
                    value={formData.totalAmount}
                    onChange={handleAmountChange}
                    className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${errors.benefitsLimit ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                  />
                </div>
                {errors.totalAmount && <p className="text-red-500 text-xs mt-1">{errors.totalAmount}</p>}
                {errors.benefitsLimit && <p className="text-red-500 text-xs mt-1">{errors.benefitsLimit}</p>}
                {packageInfo.name !== 'No Package' && !errors.benefitsLimit && formData.totalAmount && (
                  <p className="text-green-600 text-xs mt-1">
                    {`Amount is within your remaining benefits limit of ${formatCurrency(packageInfo.remaining)}`}
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How would you like to receive the reimbursement?</label>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="claimMethod"
                      value="cash"
                      checked={formData.claimMethod === 'cash'}
                      onChange={handleInputChange}
                      className="mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium">Cash - Pick up at HR Office</span>
                      <p className="text-xs text-gray-500">Receive your reimbursement in cash from the HR office</p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="claimMethod"
                      value="salary"
                      checked={formData.claimMethod === 'salary'}
                      onChange={handleInputChange}
                      className="mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium">Include in Next Salary</span>
                      <p className="text-xs text-gray-500">Reimbursement will be added to your next salary payment</p>
                    </div>
                  </label>
                </div>
                {errors.claimMethod && <p className="text-red-500 text-xs mt-1">{errors.claimMethod}</p>}
              </div>

              {/* File Uploads */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach Receipt and Medical Certificate / Hospital Verification
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-purple-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600 mb-1">Drop file here or</p>
                    <button
                      type="button"
                      onClick={() => medicalReceiptInputRef.current?.click()}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Upload Medical Receipt
                    </button>

                    <button
                      type="button"
                      onClick={() => medicalCertInputRef.current?.click()}
                      className="text-blue-600 hover:underline text-sm ml-4"
                    >
                      Upload Medical Certificate
                    </button>
                  </div>
                  <input
                    ref={medicalReceiptInputRef}
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'medicalReceipt')}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <input
                    ref={medicalCertInputRef}
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'medicalCert')}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {formData.medicalReceipt && (
                    <p className="text-xs text-green-600 mt-2">Receipt: {formData.medicalReceipt.name}</p>
                  )}
                  {formData.medicalCert && (
                    <p className="text-xs text-green-600 mt-1">Certificate: {formData.medicalCert.name}</p>
                  )}
                </div>
                {errors.files && <p className="text-red-500 text-xs mt-1">{errors.files}</p>}
              </div>

              {/* Certification Checkbox */}
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
              {errors.isVerified && <p className="text-red-500 text-xs">{errors.isVerified}</p>}

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isSubmitting || (packageInfo.name === 'No Package')}
                  className={`px-8 py-3 text-white rounded-full font-medium ${isSubmitting || packageInfo.name === 'No Package'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : packageInfo.name === 'No Package'
                      ? 'No Benefits Package Available'
                      : 'Submit Reimbursement Request'
                  }
                </button>
              </div>

              {packageInfo.name === 'No Package' && (
                <p className="text-center text-red-500 text-sm">
                  You don't have an active benefits package. Please contact HR to avail benefits.
                </p>
              )}
            </form>
          </div>
        </main>
      </div>
    </>
  );
}