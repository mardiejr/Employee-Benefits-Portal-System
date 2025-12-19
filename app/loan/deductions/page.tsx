"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EmployeeNavbar from "../../components/EmployeeNavbar";
import useUserProfile from "../../hooks/useUserProfile";
import useAuth from "../../hooks/useAuth";
import {
  Calendar, Clock, DollarSign, CreditCard, FileText, AlertCircle, ChevronDown,
  ChevronUp, CheckCircle, BarChart2, Clipboard, CreditCard as PaymentIcon,
  Calendar as ScheduleIcon, Info
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Deduction {
  id: number;
  deductionDate: string;
  amount: number;
  status: string;
  paymentStatus?: string;
  actualDeductionDate: string | null;
  isEarlyPayment?: boolean;
  paymentNotes?: string;
  paymentAmount?: number;
}

interface PaymentTransaction {
  date: string;
  amount: number;
  appliedTo: string;
  paymentType: string;
  notes?: string;
}

// New interface for payment history from the dedicated table
interface PaymentHistory {
  id: number;
  loanId: number;
  loanType: string;
  paymentAmount: number;
  paymentDate: string;
  transactionId: string;
  notes: string;
}

interface Loan {
  id: number;
  type: string;
  amount: number;
  repaymentTerm: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  carMake?: string;
  carModel?: string;
  carYear?: string;
  propertyType?: string;
  propertyAddress?: string;
  deductions: Deduction[];
  payments: PaymentTransaction[];
  // Calculated fields
  remainingBalance?: number;
  monthlyDeduction?: number;
  nextDeductionDate?: string;
  startDate?: string;
  endDate?: string;
  // Payment history stats
  paidAmount?: number;
  remainingAmount?: number;
  paidMonths?: number;
  remainingMonths?: number;
}

enum TabType {
  LoanSchedule = 'loanSchedule',
  PaymentTransactions = 'paymentTransactions'
}

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full shadow-md bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 z-50 transition-opacity duration-300 ease-in-out"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </>
  );
};

export default function LoanDeductionsPage() {
  const { handleApiError } = useAuth();
  const { userProfile, isApprover, loading: profileLoading } = useUserProfile();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentHistoryLoading, setIsPaymentHistoryLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedLoan, setExpandedLoan] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(TabType.LoanSchedule);
  const router = useRouter();

  // Fetch approved loans when component mounts or userProfile changes
  useEffect(() => {
    if (userProfile) {
      fetchLoans();
      fetchPaymentHistory();
    }
  }, [userProfile]);

  const fetchLoans = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      // Fetch all loans with their deductions in a single API call
      const response = await fetch('/api/loan/deductions');

      if (!response.ok) {
        throw new Error("Failed to fetch loan data");
      }

      const data = await response.json();

      // Process and calculate additional fields for each loan
      const processedLoans = data.loans.map(processLoan);

      setLoans(processedLoans);
    } catch (error) {
      console.error("Error fetching loans:", error);
      setErrorMessage("Failed to load your loan information. Please try again later.");
      handleApiError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    setIsPaymentHistoryLoading(true);

    try {
      const response = await fetch('/api/loan/payment-history');

      if (!response.ok) {
        throw new Error("Failed to fetch payment history");
      }

      const data = await response.json();

      if (data.success) {
        setPaymentHistory(data.payments);
      } else {
        throw new Error(data.error || "Failed to fetch payment history");
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      // Don't show error message for payment history, just log it
    } finally {
      setIsPaymentHistoryLoading(false);
    }
  };

  const processLoan = (loan: any): Loan => {
    // Sort deductions by date
    const sortedDeductions = [...loan.deductions].sort(
      (a: Deduction, b: Deduction) => new Date(a.deductionDate).getTime() - new Date(b.deductionDate).getTime()
    );

    // Calculate remaining balance
    const deductedAmount = sortedDeductions
      .filter((d: Deduction) => d.status === "Deducted")
      .reduce((sum: number, d: Deduction) => sum + d.amount, 0);
    const remainingBalance = loan.amount - deductedAmount;

    // Calculate monthly deduction (average if deductions exist, otherwise divide by term)
    const termMonths = parseInt(loan.repaymentTerm.split(' ')[0]);
    const monthlyDeduction = sortedDeductions.length > 0
      ? sortedDeductions[0].amount
      : loan.amount / termMonths;

    // Find next deduction date
    const today = new Date();
    const nextDeduction = sortedDeductions.find(
      (d: Deduction) => (d.status === "Pending" || d.status === "Upcoming") &&
        new Date(d.deductionDate) >= today
    );
    const nextDeductionDate = nextDeduction?.deductionDate ||
      (sortedDeductions.length > 0 ? sortedDeductions[sortedDeductions.length - 1].deductionDate : null);

    // Calculate start and end dates
    let startDate = "";
    let endDate = "";

    if (sortedDeductions.length > 0) {
      // Use first deduction date as start date
      startDate = sortedDeductions[0].deductionDate;

      // Use last deduction date as end date
      endDate = sortedDeductions[sortedDeductions.length - 1].deductionDate;
    } else {
      // If no deductions, estimate dates based on approval date and term
      const approvalDate = new Date(loan.updatedAt);
      const estimatedStartDate = new Date(approvalDate);
      estimatedStartDate.setDate(15); // Assume deductions on the 15th

      const estimatedEndDate = new Date(estimatedStartDate);
      estimatedEndDate.setMonth(estimatedStartDate.getMonth() + termMonths - 1);

      startDate = estimatedStartDate.toISOString().split('T')[0];
      endDate = estimatedEndDate.toISOString().split('T')[0];
    }

    return {
      ...loan,
      deductions: sortedDeductions,
      remainingBalance,
      monthlyDeduction,
      nextDeductionDate: nextDeductionDate || new Date().toISOString().split('T')[0],
      startDate,
      endDate,
      // These are coming directly from the API response now
      paidAmount: loan.paidAmount || deductedAmount,
      remainingAmount: loan.remainingAmount || remainingBalance,
      paidMonths: loan.paidMonths || sortedDeductions.filter((d: Deduction) => d.status === "Deducted").length,
      remainingMonths: loan.remainingMonths || sortedDeductions.filter((d: Deduction) => d.status !== "Deducted").length
    };
  };

  const toggleLoanDetails = (loanId: number) => {
    setExpandedLoan(expandedLoan === loanId ? null : loanId);
    // Reset active tab when expanding a loan
    setActiveTab(TabType.LoanSchedule);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-PH', options);
  };

  const calculateDeductionPercentage = (loan: Loan) => {
    if (!userProfile || !userProfile.salary || !loan.monthlyDeduction) return 0;
    return (loan.monthlyDeduction / parseFloat(userProfile.salary.toString())) * 100;
  };

  const calculateProgressPercentage = (loan: Loan) => {
    const totalMonths = (loan.paidMonths || 0) + (loan.remainingMonths || 0);
    return totalMonths > 0 ? ((loan.paidMonths || 0) / totalMonths) * 100 : 0;
  };

  const getStatusStyles = (status: string, paymentStatus?: string) => {
    let baseClasses = "px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full";

    // Status styles
    switch (status) {
      case "Deducted":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Partially Deducted":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "Pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getPaymentStatusStyles = (paymentStatus?: string) => {
    if (!paymentStatus) return "";

    let baseClasses = "ml-1 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full";

    // Payment status styles
    switch (paymentStatus) {
      case "Fully Paid":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Partially Paid":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "Overpaid":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return "";
    }
  };

  // Render loading state
  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <EmployeeNavbar isApprover={isApprover} />
        <div className="flex items-center justify-center h-[500px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-lg">Loading loan information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <EmployeeNavbar isApprover={isApprover} />

      {/* Hero Section */}
      <div
        className="flex-1 flex items-start justify-center px-6 md:px-16 py-30 bg-cover bg-center min-h-[300px]"
        style={{ backgroundImage: "url('../placeholder/loanpic.svg')" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 max-w-7xl w-full items-start">
          {/* Left Side - Text */}
          <div className="text-center md:text-left mt-8 md:mt-0">
            <h1 className="text-2xl md:text-3xl font-bold text-orange-500 mb-4 leading-snug">
              Loan Deductions
            </h1>
            <p className="text-2xl md:text-4xl font-bold text-blue-900 mb-4 leading-snug">
              Track Your Loan Payments
            </p>

            <p className="text-gray-700 text-lg md:text-l mb-6">
              View your approved loans and track the scheduled salary deductions. This page provides a
              comprehensive overview of your current loan obligations, including monthly payment amounts,
              remaining balances, and payment schedules.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 md:px-20 py-10">
        <h2 className="text-3xl font-bold text-blue-800 mb-6">Your Active Loans</h2>

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start">
            <AlertCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {loans.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
            <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Loans</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              You don't have any approved loans at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {loans.map(loan => (
              <div key={loan.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {/* Loan Header */}
                <div className={`px-6 py-4 ${loan.type === "Salary Loan" ? "bg-blue-50" : loan.type === "Housing Loan" ? "bg-green-50" : "bg-purple-50"}`}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center">
                      {loan.type === "Salary Loan" ? (
                        <DollarSign className="h-6 w-6 text-blue-600 mr-2" />
                      ) : loan.type === "Housing Loan" ? (
                        <Calendar className="h-6 w-6 text-green-600 mr-2" />
                      ) : (
                        <CreditCard className="h-6 w-6 text-purple-600 mr-2" />
                      )}
                      <h3 className="text-lg font-semibold">{loan.type}</h3>
                    </div>
                    <div className="flex items-center mt-2 md:mt-0 space-x-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${loan.status === "Completed" ? "bg-blue-100 text-blue-800" :
                          loan.status === "Approved" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                        }`}>
                        {loan.status === "Completed" ? "Completed" : loan.status === "Approved" ? "Active" : loan.status}
                      </span>
                      <button
                        onClick={() => toggleLoanDetails(loan.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {expandedLoan === loan.id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Loan Summary */}
                <div className="p-6 border-b border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Loan Amount</p>
                      <p className="text-xl font-semibold">{formatCurrency(loan.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Remaining Balance</p>
                      <p className="text-xl font-semibold">{formatCurrency(loan.remainingAmount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Monthly Deduction</p>
                      <p className="text-xl font-semibold">
                        {formatCurrency(loan.monthlyDeduction || 0)}
                        <span className="text-xs text-gray-500 ml-1">
                          ({calculateDeductionPercentage(loan).toFixed(1)}% of salary)
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Next Deduction</p>
                      <p className="text-xl font-semibold">{formatDate(loan.nextDeductionDate || '')}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Progress Bar */}
                <div className="px-6 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium text-gray-700">Loan Progress</h4>
                    </div>
                    <div className="text-sm text-gray-500">
                      {loan.paidMonths} of {(loan.paidMonths || 0) + (loan.remainingMonths || 0)} payments completed
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
                    <div
                      className="bg-blue-600 h-4 rounded-full"
                      style={{ width: `${calculateProgressPercentage(loan)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mb-4">
                    <div>{formatCurrency(loan.paidAmount || 0)} paid</div>
                    <div>{formatCurrency(loan.remainingAmount || 0)} remaining</div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedLoan === loan.id && (
                  <div className="p-6">
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200 mb-6">
                      <div className="flex -mb-px space-x-6">
                        <button
                          onClick={() => setActiveTab(TabType.LoanSchedule)}
                          className={`pb-3 px-1 flex items-center border-b-2 font-medium text-sm ${activeTab === TabType.LoanSchedule
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                          <ScheduleIcon className="h-5 w-5 mr-2" />
                          Loan Schedule
                        </button>
                        <button
                          onClick={() => setActiveTab(TabType.PaymentTransactions)}
                          className={`pb-3 px-1 flex items-center border-b-2 font-medium text-sm ${activeTab === TabType.PaymentTransactions
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                          <PaymentIcon className="h-5 w-5 mr-2" />
                          Payment Transactions
                        </button>
                      </div>
                    </div>

                    {/* Loan Schedule Tab */}
                    {activeTab === TabType.LoanSchedule && (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold flex items-center gap-2">
                            <ScheduleIcon className="h-5 w-5 text-blue-600" />
                            Loan Schedule
                          </h4>
                          <div className="flex items-center text-sm text-gray-500">
                            <Info className="h-4 w-4 mr-2 text-blue-500" />
                            <span>This shows your scheduled monthly payments</span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Payment #
                                </th>
                                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Due Date
                                </th>
                                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Scheduled Amount
                                </th>
                                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Payment Amount
                                </th>
                                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Payment Date
                                </th>
                                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Payment Type
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {loan.deductions.map((deduction, index) => (
                                <tr key={deduction.id} className={deduction.isEarlyPayment ? "bg-green-50" : ""}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {index + 1}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDate(deduction.deductionDate)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatCurrency(deduction.amount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {deduction.paymentAmount && deduction.paymentAmount !== deduction.amount
                                      ? formatCurrency(deduction.paymentAmount)
                                      : deduction.status === 'Deducted' || deduction.status === 'Partially Deducted'
                                        ? formatCurrency(deduction.amount)
                                        : "-"
                                    }
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={getStatusStyles(deduction.status)}>
                                      {deduction.status}
                                    </span>
                                    {deduction.paymentStatus && deduction.status !== 'Upcoming' && (
                                      <span className={getPaymentStatusStyles(deduction.paymentStatus)}>
                                        {deduction.paymentStatus}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {deduction.actualDeductionDate ? formatDate(deduction.actualDeductionDate) : "-"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {deduction.isEarlyPayment ? (
                                      <span className="text-green-600 font-medium">Early Payment</span>
                                    ) : deduction.status === "Deducted" || deduction.status === "Partially Deducted" ? (
                                      "Salary Deduction"
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Payment Transactions Tab - UPDATED TO USE PAYMENT HISTORY */}
                    {activeTab === TabType.PaymentTransactions && (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold flex items-center gap-2">
                            <PaymentIcon className="h-5 w-5 text-blue-600" />
                            Payment Transactions
                          </h4>
                          <div className="flex items-center text-sm text-gray-500">
                            <Info className="h-4 w-4 mr-2 text-blue-500" />
                            <span>This shows your actual payment history</span>
                          </div>
                        </div>

                        {/* Show loading state for payment history */}
                        {isPaymentHistoryLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
                            <span>Loading payment history...</span>
                          </div>
                        ) : (
                          <>
                            {paymentHistory.filter(payment =>
                              payment.loanId === loan.id && payment.loanType === loan.type
                            ).length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead>
                                    <tr>
                                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                      </th>
                                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount Paid
                                      </th>
                                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Payment Type
                                      </th>
                                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Notes
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {paymentHistory
                                      .filter(payment => payment.loanId === loan.id && payment.loanType === loan.type)
                                      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                                      .map((payment) => (
                                        <tr key={payment.id} className="bg-green-50">
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(payment.paymentDate)}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(payment.paymentAmount)}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="text-green-600 font-medium">
                                              Early Payment
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payment.notes || "-"}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-6 text-center rounded-lg">
                                <Clipboard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <h4 className="text-lg font-medium text-gray-700 mb-2">No Payment Transactions</h4>
                                <p className="text-gray-500 max-w-md mx-auto">
                                  There are no payment transactions recorded for this loan yet.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* Loan Term Info */}
                    <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">Loan Terms</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Repayment Term</p>
                          <p className="font-medium">{loan.repaymentTerm}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Start Date</p>
                          <p className="font-medium">{formatDate(loan.startDate || '')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">End Date</p>
                          <p className="font-medium">{formatDate(loan.endDate || '')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Loan-specific details */}
                    {loan.type === "Car Loan" && loan.carMake && loan.carModel && (
                      <div className="mt-4 p-4 border border-purple-100 rounded-lg bg-purple-50">
                        <h4 className="font-medium text-purple-700 mb-2">Car Details</h4>
                        <p className="text-gray-700">
                          {loan.carMake} {loan.carModel}
                        </p>
                      </div>
                    )}

                    {loan.type === "Housing Loan" && loan.propertyType && loan.propertyAddress && (
                      <div className="mt-4 p-4 border border-green-100 rounded-lg bg-green-50">
                        <h4 className="font-medium text-green-700 mb-2">Property Details</h4>
                        <p className="text-gray-700">
                          <strong>{loan.propertyType}</strong>: {loan.propertyAddress}
                        </p>
                      </div>
                    )}

                    {/* Salary Impact */}
                    <div className="mt-6 p-4 border border-blue-100 rounded-lg bg-blue-50">
                      <h4 className="font-medium text-blue-700 flex items-center mb-2">
                        <FileText className="h-5 w-5 mr-2" />
                        Salary Impact
                      </h4>
                      <p className="text-gray-700">
                        This loan deducts <strong>{formatCurrency(loan.monthlyDeduction || 0)}</strong> from your monthly salary,
                        which is approximately <strong>{calculateDeductionPercentage(loan).toFixed(1)}%</strong> of your current salary.
                        Deductions are made on the 15th of each month.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <ScrollToTopButton />
    </div>
  );
}