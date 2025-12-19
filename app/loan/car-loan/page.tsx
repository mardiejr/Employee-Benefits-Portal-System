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
  carMake: string;
  carModel: string;
  carYear: string;
  vehiclePrice: string;
  loanAmountRequested: string;
  repaymentTerm: string;
  dealerName: string;
  monthlySalary: string;
  comakerDocument: File | null;
  carQuotation: File | null;
  isVerified: boolean;
}

interface CarData {
  [make: string]: {
    [model: string]: {
      years: number[];
      basePrice: number;
      priceIncrement: number;
    };
  };
}

const carData: CarData = {
  TOYOTA: {
    Camry: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1400000, priceIncrement: 100000 },
    Corolla: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1000000, priceIncrement: 80000 },
    Vios: { years: [2020, 2021, 2022, 2023, 2024], basePrice: 800000, priceIncrement: 50000 },
    Fortuner: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1500000, priceIncrement: 100000 },
    Raize: { years: [2021, 2022, 2023, 2024, 2025], basePrice: 900000, priceIncrement: 75000 },
    Innova: { years: [2020, 2021, 2022, 2023, 2024], basePrice: 1100000, priceIncrement: 75000 }
  },
  HONDA: {
    Civic: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1300000, priceIncrement: 100000 },
    City: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 900000, priceIncrement: 50000 },
    'BR-V': { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1100000, priceIncrement: 60000 },
    'HR-V': { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1200000, priceIncrement: 80000 },
    Brio: { years: [2020, 2021, 2022, 2023, 2024], basePrice: 700000, priceIncrement: 50000 }
  },
  MAZDA: {
    Mazda2: { years: [2020, 2021, 2022, 2023, 2024], basePrice: 1000000, priceIncrement: 50000 },
    Mazda3: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1300000, priceIncrement: 60000 },
    'CX-3': { years: [2020, 2021, 2022, 2023, 2024], basePrice: 1200000, priceIncrement: 75000 },
    'CX-5': { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1500000, priceIncrement: 80000 },
    'BT-50': { years: [2020, 2021, 2022, 2023, 2024], basePrice: 1200000, priceIncrement: 125000 }
  },
  FORD: {
    Ranger: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1200000, priceIncrement: 100000 },
    Everest: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1500000, priceIncrement: 100000 },
    Territory: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1200000, priceIncrement: 60000 },
    EcoSport: { years: [2020, 2021, 2022, 2023], basePrice: 900000, priceIncrement: 66667 },
    Focus: { years: [2020, 2021, 2022, 2023, 2024], basePrice: 1000000, priceIncrement: 75000 }
  },
  NISSAN: {
    Almera: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 850000, priceIncrement: 30000 },
    Navara: { years: [2020, 2021, 2022, 2023, 2024, 2025], basePrice: 1200000, priceIncrement: 100000 },
    Terra: { years: [2020, 2021, 2022, 2023, 2024], basePrice: 1400000, priceIncrement: 125000 },
    Livina: { years: [2021, 2022, 2023, 2024, 2025], basePrice: 1000000, priceIncrement: 50000 },
    'X-Trail': { years: [2020, 2021, 2022, 2023, 2024], basePrice: 1300000, priceIncrement: 100000 }
  }
};

const loanLimits: { [key: string]: number } = {
  'President': 2000000,
  'Vice President': 1500000,
  'Senior Manager': 1000000,
  'Division Manager': 900000,
  'Department Supervisor': 850000,
  'Manager': 900000,
  'Assistant Manager': 800000,
  'HR Manager': 900000
};

export default function CarLoanPage() {
  const { handleApiError } = useAuth();
  const { userProfile, isApprover, loading } = useUserProfile();
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [maxLoanAmount, setMaxLoanAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    employeeId: '',
    position: '',
    contactNumber: '',
    carMake: '',
    carModel: '',
    carYear: '',
    vehiclePrice: '',
    loanAmountRequested: '',
    repaymentTerm: '',
    dealerName: '',
    monthlySalary: '',
    comakerDocument: null,
    carQuotation: null,
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
        setFormData(prev => ({
          ...prev,
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          employeeId: data.employee_id || '',
          position: data.position || '',
          contactNumber: data.phone_number || '',
          monthlySalary: data.salary ? data.salary.toString() : ''
        }));

        if (data.position && loanLimits[data.position]) {
          setMaxLoanAmount(loanLimits[data.position]);
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setIsLoading(false);
    }
  };

  const handleCarMakeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const make = e.target.value;
    setFormData(prev => ({
      ...prev,
      carMake: make,
      carModel: '',
      carYear: '',
      vehiclePrice: ''
    }));

    if (make && carData[make]) {
      setAvailableModels(Object.keys(carData[make]));
      setAvailableYears([]);
    } else {
      setAvailableModels([]);
      setAvailableYears([]);
    }
  };

  const handleCarModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    setFormData(prev => ({
      ...prev,
      carModel: model,
      carYear: '',
      vehiclePrice: ''
    }));

    if (formData.carMake && model && carData[formData.carMake][model]) {
      setAvailableYears(carData[formData.carMake][model].years);
    } else {
      setAvailableYears([]);
    }
  };

  const handleCarYearChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setFormData(prev => ({ ...prev, carYear: year }));

    if (formData.carMake && formData.carModel && year) {
      const modelData = carData[formData.carMake][formData.carModel];
      const yearIndex = modelData.years.indexOf(parseInt(year));
      const price = modelData.basePrice + (yearIndex * modelData.priceIncrement);
      setFormData(prev => ({ ...prev, vehiclePrice: price.toString() }));
    }
  };

  const handleLoanAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setFormData(prev => ({ ...prev, loanAmountRequested: value }));
  };

  const handleDealerNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setFormData(prev => ({ ...prev, dealerName: value }));
  };

  const isLoanAmountValid = () => {
    const amount = parseInt(formData.loanAmountRequested);
    return !isNaN(amount) && amount >= 10000 && amount <= maxLoanAmount;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, fileType: 'comakerDocument' | 'carQuotation') => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      [fileType]: file
    }));
  };

  const isFormValid = () => {
    return (
      formData.firstName &&
      formData.lastName &&
      formData.employeeId &&
      formData.position &&
      formData.contactNumber &&
      formData.carMake &&
      formData.carModel &&
      formData.carYear &&
      formData.vehiclePrice &&
      formData.loanAmountRequested &&
      isLoanAmountValid() &&
      formData.repaymentTerm &&
      formData.dealerName &&
      formData.monthlySalary &&
      formData.comakerDocument &&
      formData.carQuotation &&
      formData.isVerified
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid()) {
      alert('Please fill out all required fields correctly.');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('employeeId', formData.employeeId);
      submitData.append('position', formData.position);
      submitData.append('contactNumber', formData.contactNumber);
      submitData.append('carMake', formData.carMake);
      submitData.append('carModel', formData.carModel);
      submitData.append('carYear', formData.carYear);
      submitData.append('vehiclePrice', formData.vehiclePrice);
      submitData.append('loanAmountRequested', formData.loanAmountRequested);
      submitData.append('repaymentTerm', formData.repaymentTerm);
      submitData.append('dealerName', formData.dealerName);
      submitData.append('monthlySalary', formData.monthlySalary);

      if (formData.comakerDocument) submitData.append('comakerDocument', formData.comakerDocument);
      if (formData.carQuotation) submitData.append('carQuotationFile', formData.carQuotation);

      const response = await fetch('/api/loan/car-loan/submit', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        alert('Car loan application submitted successfully!');
        window.location.href = '/status';
      } else {
        alert(result.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred while submitting the application');
    } finally {
      setIsSubmitting(false);
    }
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
            <li className="text-gray-900">Car Loan</li>
          </ol>
        </nav>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Car Loan</h2>
          <p className="text-sm text-gray-600 mb-4">
            For any concerns or questions regarding your car loan, you may reach out 24/7 Call Center at
            8-582-1818 (Metro Manila) or 1-800-10-InLife (domestic toll-free) or as well as via email at <span className="text-blue-600">customercare@insular.com.ph</span>
          </p>
          <p className="text-xs text-gray-500 mb-6">Today&apos;s Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Car Make *</label>
              <select
                name="carMake"
                value={formData.carMake}
                onChange={handleCarMakeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Car Make</option>
                {Object.keys(carData).map(make => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Car Model *</label>
              <select
                name="carModel"
                value={formData.carModel}
                onChange={handleCarModelChange}
                disabled={!formData.carMake}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              >
                <option value="">Select Car Model</option>
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year Model *</label>
              <select
                name="carYear"
                value={formData.carYear}
                onChange={handleCarYearChange}
                disabled={!formData.carModel}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              >
                <option value="">Select Year Model</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Price</label>
              <input
                type="text"
                name="vehiclePrice"
                value={formData.vehiclePrice ? `₱${parseInt(formData.vehiclePrice).toLocaleString()}` : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Amount Requested *
                {maxLoanAmount > 0 && <span className="text-gray-500 text-xs">(Min: ₱10,000 | Max: ₱{maxLoanAmount.toLocaleString()})</span>}
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
                  {parseInt(formData.loanAmountRequested) > maxLoanAmount && (
                    <p className="text-xs text-red-600 mt-1">Exceeds maximum loan amount for your position</p>
                  )}
                  {parseInt(formData.loanAmountRequested) < 10000 && (
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
                <option value="12 months">12 Months</option>
                <option value="24 months">24 Months</option>
                <option value="36 months">36 Months</option>
                <option value="48 months">48 Months</option>
                <option value="60 months">60 Months</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dealer/Seller Name *</label>
              <input
                type="text"
                name="dealerName"
                placeholder="Type Dealer or Seller Name"
                value={formData.dealerName}
                onChange={handleDealerNameChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {formData.dealerName && !/^[a-zA-Z\s]+$/.test(formData.dealerName) && (
                <p className="text-xs text-red-600 mt-1">Only letters are allowed</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Salary</label>
              <input
                type="text"
                name="monthlySalary"
                value={formData.monthlySalary ? `₱${parseFloat(formData.monthlySalary).toLocaleString()}` : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                disabled
              />
            </div>

            <div className="space-y-4">
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
                  Attach Vehicle Quotation/Proforma Invoice *
                </label>
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center bg-purple-50">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-600">Drop file here or</p>
                    <label htmlFor="car-quotation-upload" className="text-blue-600 underline cursor-pointer">
                      click to browse
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'carQuotation')}
                      className="hidden"
                      accept=".png,.jpg,.jpeg,.pdf"
                      id="car-quotation-upload"
                    />
                    {formData.carQuotation && (
                      <p className="text-sm text-green-600 mt-2">✓ {formData.carQuotation.name}</p>
                    )}
                  </div>
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
                I certify that the information provided is true and correct. I understand that this application will be subject to approval by the company and verification.
              </label>
            </div>

            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={!isFormValid() || isSubmitting}
                className={`px-8 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isFormValid() && !isSubmitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Car Loan Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}