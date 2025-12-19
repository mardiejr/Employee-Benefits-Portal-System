"use client";
import { useState, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import { DollarSign, Search, Calendar, CreditCard, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import SimplePaymentModal from "../../components/SimplePaymentModal";
import TestDateControl from "../../components/TestDateControl"; // Import the TestDateControl component

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
}

interface Deduction {
  id: number;
  deductionDate: string;
  amount: number;
  status: string;
  actualDeductionDate: string | null;
  isEarlyPayment?: boolean;
  paymentNotes?: string;
  paymentAmount?: number;
  paymentStatus?: string;
}

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
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  amount: number;
  repaymentTerm: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  deductions: Deduction[];
  // Additional loan details
  carMake?: string;
  carModel?: string;
  propertyType?: string;
  propertyAddress?: string;
  // Calculated fields
  paidMonths: number;
  remainingMonths: number;
  paidAmount: number;
  remainingAmount: number;
}

export default function AdminLoanDeductionsPage() {
  // Fix: Use appropriate properties from useAuth
  const { handleApiError } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentHistoryLoading, setIsPaymentHistoryLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [loanTypeFilter, setLoanTypeFilter] = useState("All");
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule" | "transactions">("schedule");

  // Fetch loans on component mount
  useEffect(() => {
    fetchAllLoans();
    fetchPaymentHistory();
  }, []);

  useEffect(() => {
    // Filter loans based on search term and loan type
    if (loans.length > 0) {
      let filtered = [...loans];

      // Filter by loan type
      if (loanTypeFilter !== "All") {
        filtered = filtered.filter(loan => loan.type === loanTypeFilter);
      }

      // Filter by search term (employee name, ID, or loan type)
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          loan =>
            loan.employeeName.toLowerCase().includes(term) ||
            loan.employeeId.toLowerCase().includes(term) ||
            loan.id.toString().toLowerCase().includes(term)
        );
      }

      setFilteredLoans(filtered);
    }
  }, [loans, searchTerm, loanTypeFilter]);

  const fetchAllLoans = async () => {
    setIsLoading(true);

    try {
      console.log("Fetching loan data...");
      const response = await fetch("/api/admin/loans/deductions");

      if (!response.ok) {
        throw new Error("Failed to fetch loans");
      }

      const data = await response.json();

      if (data.success && data.loans) {
        console.log(`Successfully loaded ${data.loans.length} loans`);
        setLoans(data.loans);
        setFilteredLoans(data.loans);
      } else {
        console.error("No loan data returned:", data);
        toast.error("No loan data available");
      }
    } catch (error) {
      console.error("Error fetching loans:", error);
      toast.error("Failed to load loan information");
      if (handleApiError) {
        handleApiError(error as Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    setIsPaymentHistoryLoading(true);

    try {
      const response = await fetch("/api/loan/payment-history");

      if (!response.ok) {
        throw new Error("Failed to fetch payment history");
      }

      const data = await response.json();

      if (data.success) {
        setPaymentHistory(data.payments);
      } else {
        console.error("Failed to fetch payment history:", data.error);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      // Don't show error toast for payment history
    } finally {
      setIsPaymentHistoryLoading(false);
    }
  };

  // Refresh function for TestDateControl
  const refreshData = () => {
    fetchAllLoans();
    fetchPaymentHistory();
  };

  // Updated toggle function that uses both loan type and ID to create a unique identifier
  const toggleLoanDetails = (loanId: string, loanType: string) => {
    const uniqueId = `${loanType}-${loanId}`;
    setExpandedLoan(expandedLoan === uniqueId ? null : uniqueId);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-PH', options);
  };

  // Handle payment button click - open modal
  const handlePaymentClick = (loan: Loan) => {
    setSelectedLoan(loan);
  };

  // Process the payment - UPDATED to use both APIs
  const processPayment = async (amount: number, notes: string) => {
    if (!selectedLoan || processingPayment) return;

    setProcessingPayment(true);

    try {
      // First, record the payment in payment history WITHOUT processing deductions
      const recordResponse = await fetch("/api/admin/record-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: selectedLoan.id,
          loanType: selectedLoan.type,
          paymentAmount: amount,
          notes: notes || "Payment processed by admin",
          skipDeductionProcessing: true // Skip automatic deduction processing
        }),
      });

      if (!recordResponse.ok) {
        const errorData = await recordResponse.json();
        throw new Error(errorData.error || "Failed to record payment");
      }

      // Find ALL unpaid deductions for this loan
      const unpaidDeductions = selectedLoan.deductions
        .filter(d => d.status !== 'Deducted' && d.status !== 'Partially Deducted')
        .sort((a, b) => new Date(a.deductionDate).getTime() - new Date(b.deductionDate).getTime());

      if (unpaidDeductions.length === 0) {
        throw new Error("No unpaid deductions found for this loan");
      }

      // Initialize variables to track payment allocation
      let remainingPayment = amount;
      const updatedDeductions = [];

      // Process payments for each unpaid deduction until payment is fully used
      for (const deduction of unpaidDeductions) {
        if (remainingPayment <= 0) break;

        const deductionAmount = deduction.amount;
        const amountToApply = Math.min(remainingPayment, deductionAmount);

        // Make API call to process payment for this deduction
        const response = await fetch("/api/admin/loans/deductions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loanId: selectedLoan.id,
            loanType: selectedLoan.type,
            deductionId: deduction.id,
            paymentAmount: amountToApply,
            notes: notes || "Payment processed by admin"
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process payment");
        }

        const result = await response.json();
        updatedDeductions.push(result);

        // Subtract the applied amount from the remaining payment
        remainingPayment -= amountToApply;
      }

      // Show success message
      toast.success(`Payment of ${formatCurrency(amount)} processed successfully`);

      // Refresh loan data and payment history
      fetchAllLoans();
      fetchPaymentHistory();

      // Close the modal
      setSelectedLoan(null);

    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Get payment status style
  const getPaymentStatusStyle = (status?: string) => {
    switch (status) {
      case 'Fully Paid':
        return "bg-green-100 text-green-800";
      case 'Partially Paid':
        return "bg-yellow-100 text-yellow-800";
      case 'Overpaid':
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg">Loading loans...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-blue-800 mb-6">Loan Deduction Management</h1>

      {/* Add TestDateControl here */}
      <TestDateControl onRefresh={refreshData} />

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by employee name or ID..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Loan Type:</span>
            <select
              className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
              value={loanTypeFilter}
              onChange={(e) => setLoanTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Salary Loan">Salary Loans</option>
              <option value="Car Loan">Car Loans</option>
              <option value="Housing Loan">Housing Loans</option>
            </select>

            <button
              className="ml-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => {
                fetchAllLoans();
                fetchPaymentHistory();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Loans Found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchTerm || loanTypeFilter !== "All"
              ? "No loans match your search criteria. Try adjusting your filters."
              : "There are no active loans in the system."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLoans.map(loan => (
            <div key={`${loan.type}-${loan.id}`} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              {/* Loan Header */}
              <div className={`px-6 py-4 ${loan.type === "Salary Loan" ? "bg-blue-50" : loan.type === "Housing Loan" ? "bg-green-50" : "bg-purple-50"}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center">
                    {loan.type === "Salary Loan" ? (
                      <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                    ) : loan.type === "Housing Loan" ? (
                      <Calendar className="h-5 w-5 text-green-600 mr-2" />
                    ) : (
                      <CreditCard className="h-5 w-5 text-purple-600 mr-2" />
                    )}
                    <h3 className="font-semibold text-lg">{loan.type}</h3>
                    <span className="ml-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ID: {loan.id}
                    </span>
                  </div>

                  <div className="flex items-center mt-2 md:mt-0 space-x-2">
                    {loan.remainingAmount > 0 && (
                      <button
                        onClick={() => handlePaymentClick(loan)}
                        className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Process Payment
                      </button>
                    )}

                    <button
                      onClick={() => toggleLoanDetails(loan.id, loan.type)}
                      className="text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {expandedLoan === `${loan.type}-${loan.id}` ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Employee Info */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Employee</p>
                    <p className="font-medium">{loan.employeeName} <span className="text-gray-500 text-sm">({loan.employeeId})</span></p>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    <p className="text-sm text-gray-500">Loan Amount</p>
                    <p className="font-semibold text-lg">{formatCurrency(loan.amount)}</p>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    <p className="text-sm text-gray-500">Repayment Term</p>
                    <p className="font-medium">{loan.repaymentTerm}</p>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    <p className="text-sm text-gray-500">Remaining Balance</p>
                    <p className="font-semibold text-lg">{formatCurrency(loan.remainingAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedLoan === `${loan.type}-${loan.id}` && (
                <div className="p-6">
                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200 mb-6">
                    <div className="flex -mb-px space-x-6">
                      <button
                        onClick={() => setActiveTab("schedule")}
                        className={`pb-3 px-1 flex items-center border-b-2 font-medium text-sm ${activeTab === "schedule"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                      >
                        <Calendar className="h-5 w-5 mr-2" />
                        Payment Schedule
                      </button>
                      <button
                        onClick={() => setActiveTab("transactions")}
                        className={`pb-3 px-1 flex items-center border-b-2 font-medium text-sm ${activeTab === "transactions"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        Payment Transactions
                      </button>
                    </div>
                  </div>

                  {/* Payment Schedule Tab */}
                  {activeTab === "schedule" && (
                    <>
                      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        Payment Schedule
                      </h4>

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
                              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Notes
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
                                      : "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {deduction.status === "Deducted" ? (
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                      {deduction.status}
                                    </span>
                                  ) : deduction.status === "Partially Deducted" ? (
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      {deduction.status}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                      {deduction.status}
                                    </span>
                                  )}

                                  {/* Only show payment status for Partially Deducted items */}
                                  {deduction.paymentStatus && deduction.status === "Partially Deducted" && (
                                    <span className={`ml-1 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusStyle(deduction.paymentStatus)}`}>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {deduction.paymentNotes || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Payment Transactions Tab */}
                  {activeTab === "transactions" && (
                    <>
                      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        Payment Transactions
                      </h4>

                      {isPaymentHistoryLoading ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
                          <span>Loading payment history...</span>
                        </div>
                      ) : paymentHistory.filter(payment =>
                        parseInt(payment.loanId.toString()) === parseInt(loan.id.toString()) && payment.loanType === loan.type
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
                                  Transaction ID
                                </th>
                                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Notes
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {paymentHistory
                                .filter(payment => parseInt(payment.loanId.toString()) === parseInt(loan.id.toString()) && payment.loanType === loan.type)
                                .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                                .map((payment) => (
                                  <tr key={payment.id} className="bg-green-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {formatDate(payment.paymentDate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {formatCurrency(payment.paymentAmount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {payment.transactionId}
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
                          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <h4 className="text-lg font-medium text-gray-700 mb-2">No Payment Transactions</h4>
                          <p className="text-gray-500 max-w-md mx-auto">
                            There are no payment transactions recorded for this loan yet.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Simple Payment Modal */}
      {selectedLoan && (
        <SimplePaymentModal
          loanId={selectedLoan.id}
          loanType={selectedLoan.type}
          employeeName={selectedLoan.employeeName}
          loanAmount={selectedLoan.amount}
          remainingAmount={selectedLoan.remainingAmount}
          onClose={() => setSelectedLoan(null)}
          onSubmit={processPayment}
        />
      )}
    </div>
  );
}