"use client";
import { useState, useEffect } from "react";
import { DollarSign, Home, Car, Search, Edit, Trash2, Check, X, FileText, ArrowUpDown, Filter, Eye, Clock, Download, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

// Types
type LoanType = "all" | "salary" | "housing" | "car";
type LoanStatus = "all" | "Pending" | "Approved" | "Rejected";

interface Loan {
  id: string;
  type: string;
  employeeId: string;
  employeeName: string;
  position: string;
  amount: number;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  updatedAt: string;
  currentApprovalLevel: number;
  approvalStage: string;
  details: any;
}

// Utility components
const LoanDetailRow = ({ label, value }: { label: string, value: any }) => (
  <div className="grid grid-cols-2 py-2 border-b border-gray-100">
    <div className="text-gray-600 font-medium">{label}</div>
    <div className="text-gray-900">{value}</div>
  </div>
);

export default function LoanManagementPage() {
  // States
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [loanTypeFilter, setLoanTypeFilter] = useState<LoanType>("all");
  const [statusFilter, setStatusFilter] = useState<LoanStatus>("all");
  const [sortField, setSortField] = useState<keyof Loan>("submittedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentLoan, setCurrentLoan] = useState<Loan | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch loans and apply filters
  useEffect(() => { fetchLoans(); }, []);
  useEffect(() => { applyFilters(); }, [loans, searchTerm, loanTypeFilter, statusFilter, sortField, sortDirection]);

  // Fetch loans from API
  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const [salaryLoanRes, housingLoanRes, carLoanRes] = await Promise.all([
        fetch('/api/admin/loans?type=salary'),
        fetch('/api/admin/loans?type=housing'),
        fetch('/api/admin/loans?type=car')
      ]);

      const [salaryData, housingData, carData] = await Promise.all([
        salaryLoanRes.json(),
        housingLoanRes.json(),
        carLoanRes.json()
      ]);

      const allLoans = [
        ...(salaryData.loans || []).map(formatSalaryLoan),
        ...(housingData.loans || []).map(formatHousingLoan),
        ...(carData.loans || []).map(formatCarLoan)
      ];

      setLoans(allLoans);
    } catch (error) {
      console.error("Error fetching loans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format loan data
  const formatSalaryLoan = (loan: any): Loan => ({
    id: `salary-${loan.id}`,
    type: "Salary Loan",
    employeeId: loan.employee_id,
    employeeName: `${loan.first_name} ${loan.last_name}`,
    position: loan.position || "",
    amount: parseFloat(loan.loan_amount),
    status: loan.status,
    submittedAt: loan.submitted_at,
    updatedAt: loan.updated_at,
    currentApprovalLevel: loan.current_approval_level,
    approvalStage: getApprovalStage(loan.current_approval_level),
    details: {
      loanPurpose: loan.loan_purpose,
      repaymentTerm: loan.repayment_term,
      monthlySalary: parseFloat(loan.monthly_salary),
      contactNumber: loan.contact_number,
      comakerFilePath: loan.comaker_file_path,
    }
  });

  const formatHousingLoan = (loan: any): Loan => ({
    id: `housing-${loan.id}`,
    type: "Housing Loan",
    employeeId: loan.employee_id,
    employeeName: `${loan.first_name} ${loan.last_name}`,
    position: loan.position || "",
    amount: parseFloat(loan.loan_amount_requested),
    status: loan.status,
    submittedAt: loan.submitted_at,
    updatedAt: loan.updated_at,
    currentApprovalLevel: loan.current_approval_level,
    approvalStage: getApprovalStage(loan.current_approval_level),
    details: {
      propertyType: loan.property_type,
      propertyAddress: loan.property_address,
      propertyValue: parseFloat(loan.property_value),
      repaymentTerm: loan.repayment_term,
      sellerName: loan.seller_name,
      comakerFilePath: loan.comaker_file_path,
      propertyDocumentsFilePath: loan.property_documents_file_path,
    }
  });

  const formatCarLoan = (loan: any): Loan => ({
    id: `car-${loan.id}`,
    type: "Car Loan",
    employeeId: loan.employee_id,
    employeeName: `${loan.first_name} ${loan.last_name}`,
    position: loan.position || "",
    amount: parseFloat(loan.loan_amount_requested),
    status: loan.status,
    submittedAt: loan.submitted_at,
    updatedAt: loan.updated_at,
    currentApprovalLevel: loan.current_approval_level,
    approvalStage: getApprovalStage(loan.current_approval_level),
    details: {
      carMake: loan.car_make,
      carModel: loan.car_model,
      carYear: loan.car_year,
      vehiclePrice: parseFloat(loan.vehicle_price),
      dealerName: loan.dealer_name,
      repaymentTerm: loan.repayment_term,
      comakerFilePath: loan.comaker_file_path,
      carQuotationFilePath: loan.car_quotation_file_path,
    }
  });

  // Utility functions
  const getApprovalStage = (level: number): string => {
    const stages = [
      "Awaiting HR Approval",
      "Awaiting Supervisor/Division Manager Approval",
      "Awaiting Vice President Approval",
      "Awaiting President Approval"
    ];
    return level >= 1 && level <= 4 ? stages[level - 1] : "Pending Review";
  };

  const applyFilters = () => {
    let filtered = [...loans];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(loan =>
        loan.employeeId.toLowerCase().includes(term) ||
        loan.employeeName.toLowerCase().includes(term) ||
        loan.position.toLowerCase().includes(term)
      );
    }

    // Apply loan type filter
    if (loanTypeFilter !== "all") {
      const typeMap = { salary: "Salary Loan", housing: "Housing Loan", car: "Car Loan" };
      filtered = filtered.filter(loan => loan.type === typeMap[loanTypeFilter as keyof typeof typeMap]);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(loan => loan.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Default sort (date strings)
      return sortDirection === "asc"
        ? new Date(aValue as string).getTime() - new Date(bValue as string).getTime()
        : new Date(bValue as string).getTime() - new Date(aValue as string).getTime();
    });

    setFilteredLoans(filtered);
  };

  // Event handlers
  const handleSort = (field: keyof Loan) => {
    setSortDirection(field === sortField ? (sortDirection === "asc" ? "desc" : "asc") : "asc");
    setSortField(field);
  };

  const clearMessages = () => {
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleEdit = (loan: Loan) => {
    setCurrentLoan(loan);

    // Prepare form data based on loan type
    let initialFormData: any = {
      status: loan.status,
      currentApprovalLevel: loan.currentApprovalLevel,
    };

    if (loan.type === "Salary Loan") {
      initialFormData = {
        ...initialFormData,
        loanAmount: loan.amount,
        loanPurpose: loan.details.loanPurpose,
        repaymentTerm: loan.details.repaymentTerm,
      };
    } else if (loan.type === "Housing Loan") {
      initialFormData = {
        ...initialFormData,
        loanAmount: loan.amount,
        propertyType: loan.details.propertyType,
        propertyAddress: loan.details.propertyAddress,
        repaymentTerm: loan.details.repaymentTerm,
        sellerName: loan.details.sellerName,
      };
    } else if (loan.type === "Car Loan") {
      initialFormData = {
        ...initialFormData,
        loanAmount: loan.amount,
        carMake: loan.details.carMake,
        carModel: loan.details.carModel,
        carYear: loan.details.carYear,
        dealerName: loan.details.dealerName,
        repaymentTerm: loan.details.repaymentTerm,
      };
    }

    setFormData(initialFormData);
    setShowEditModal(true);
  };

  const handleView = (loan: Loan) => {
    setCurrentLoan(loan);
    setShowViewModal(true);
  };

  const handleDelete = (loan: Loan) => {
    setCurrentLoan(loan);
    setShowDeleteModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "loanAmount" || name === "monthlySalary" || name === "propertyValue" || name === "vehiclePrice"
        ? parseFloat(value)
        : value
    });
  };

  // API calls
  const handleUpdateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!currentLoan) return;

    const loanId = currentLoan.id.split("-")[1];
    const loanType = currentLoan.id.split("-")[0];

    try {
      const response = await fetch(`/api/admin/loans?id=${loanId}&type=${loanType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Loan updated successfully`);
        setShowEditModal(false);
        fetchLoans();
      } else {
        setErrorMessage(data.error || "Failed to update loan");
      }
    } catch (error) {
      console.error("Error updating loan:", error);
      setErrorMessage("Error connecting to server");
    }
  };

  const handleDeleteLoan = async () => {
    clearMessages();

    if (!currentLoan) return;

    const loanId = currentLoan.id.split("-")[1];
    const loanType = currentLoan.id.split("-")[0];

    try {
      const response = await fetch(`/api/admin/loans?id=${loanId}&type=${loanType}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Loan deleted successfully`);
        setShowDeleteModal(false);
        fetchLoans();
      } else {
        setErrorMessage(data.error || "Failed to delete loan");
      }
    } catch (error) {
      console.error("Error deleting loan:", error);
      setErrorMessage("Error connecting to server");
    }
  };

  // UI Helper functions
  const renderLoanIcon = (type: string) => {
    switch (type) {
      case "Salary Loan": return <DollarSign className="h-5 w-5 text-green-500" />;
      case "Housing Loan": return <Home className="h-5 w-5 text-blue-500" />;
      case "Car Loan": return <Car className="h-5 w-5 text-purple-500" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            <Check className="h-3 w-3 inline mr-1" />Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            <X className="h-3 w-3 inline mr-1" />Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 inline mr-1" />Pending
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency", currency: "PHP", minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Loan Management</h2>
        <p className="text-gray-600">View, manage, and process loan applications from all employees</p>
      </div>

      {/* Success and error messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg flex items-center">
          <Check className="h-5 w-5 mr-2" />{successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />{errorMessage}
        </div>
      )}

      {/* Filters and search */}
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
              value={loanTypeFilter}
              onChange={(e) => setLoanTypeFilter(e.target.value as LoanType)}
            >
              <option value="all">All Loan Types</option>
              <option value="salary">Salary Loans</option>
              <option value="housing">Housing Loans</option>
              <option value="car">Car Loans</option>
            </select>

            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LoanStatus)}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-grow overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-grow">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("type")} className="flex items-center gap-1 hover:text-blue-600">
                    Type
                    {sortField === "type" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">Employee ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("employeeName")} className="flex items-center gap-1 hover:text-blue-600">
                    Employee Name
                    {sortField === "employeeName" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">Position</th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("amount")} className="flex items-center gap-1 hover:text-blue-600">
                    Amount
                    {sortField === "amount" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-blue-600">
                    Status
                    {sortField === "status" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("submittedAt")} className="flex items-center gap-1 hover:text-blue-600">
                    Submitted
                    {sortField === "submittedAt" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">Approval Stage</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading loan data...</td></tr>
              ) : filteredLoans.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No loan applications found</td></tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {renderLoanIcon(loan.type)}
                        <span>{loan.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{loan.employeeId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{loan.employeeName}</td>
                    <td className="px-4 py-3 text-sm">{loan.position}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(loan.amount)}</td>
                    <td className="px-4 py-3">{renderStatusBadge(loan.status)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(loan.submittedAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      {loan.status === "Approved" ? (
                        <span className="text-green-600">Approved</span>
                      ) : loan.status === "Rejected" ? (
                        <span className="text-red-600">Rejected</span>
                      ) : (
                        <span className="text-blue-600">{loan.approvalStage}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleView(loan)} className="p-1 rounded-full hover:bg-blue-100 text-blue-600" title="View Details">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleEdit(loan)} className="p-1 rounded-full hover:bg-green-100 text-green-600" title="Edit Loan">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(loan)} className="p-1 rounded-full hover:bg-red-100 text-red-600" title="Delete Loan">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
          Showing {filteredLoans.length} of {loans.length} loans
        </div>
      </div>

      {/* View Loan Modal */}
      {showViewModal && currentLoan && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {renderLoanIcon(currentLoan.type)}
                <h3 className="text-xl font-semibold text-gray-800">{currentLoan.type} Details</h3>
              </div>
              <div>{renderStatusBadge(currentLoan.status)}</div>
            </div>

            <div className="p-6">
              {/* Employee Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-lg font-semibold mb-3">Employee Information</h4>
                  <div className="space-y-1">
                    <LoanDetailRow label="Employee ID" value={currentLoan.employeeId} />
                    <LoanDetailRow label="Name" value={currentLoan.employeeName} />
                    <LoanDetailRow label="Position" value={currentLoan.position} />
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-3">Loan Information</h4>
                  <div className="space-y-1">
                    <LoanDetailRow label="Loan Amount" value={formatCurrency(currentLoan.amount)} />
                    <LoanDetailRow label="Submitted Date" value={formatDate(currentLoan.submittedAt)} />
                    <LoanDetailRow label="Last Updated" value={formatDate(currentLoan.updatedAt)} />
                    <LoanDetailRow
                      label="Approval Stage"
                      value={currentLoan.status === "Approved" ? "Fully Approved" :
                        currentLoan.status === "Rejected" ? "Rejected" :
                          currentLoan.approvalStage}
                    />
                  </div>
                </div>
              </div>

              {/* Loan specific details */}
              <div>
                <h4 className="text-lg font-semibold mb-3">Loan Specific Details</h4>
                <div className="space-y-1">
                  {currentLoan.type === "Salary Loan" && (
                    <>
                      <LoanDetailRow label="Loan Purpose" value={currentLoan.details.loanPurpose} />
                      <LoanDetailRow label="Repayment Term" value={currentLoan.details.repaymentTerm} />
                      <LoanDetailRow label="Monthly Salary" value={formatCurrency(currentLoan.details.monthlySalary)} />
                      <LoanDetailRow label="Contact Number" value={currentLoan.details.contactNumber} />
                    </>
                  )}

                  {currentLoan.type === "Housing Loan" && (
                    <>
                      <LoanDetailRow label="Property Type" value={currentLoan.details.propertyType} />
                      <LoanDetailRow label="Property Address" value={currentLoan.details.propertyAddress} />
                      <LoanDetailRow label="Property Value" value={formatCurrency(currentLoan.details.propertyValue)} />
                      <LoanDetailRow label="Repayment Term" value={currentLoan.details.repaymentTerm} />
                      <LoanDetailRow label="Seller Name" value={currentLoan.details.sellerName} />
                    </>
                  )}

                  {currentLoan.type === "Car Loan" && (
                    <>
                      <LoanDetailRow label="Car Make" value={currentLoan.details.carMake} />
                      <LoanDetailRow label="Car Model" value={currentLoan.details.carModel} />
                      <LoanDetailRow label="Car Year" value={currentLoan.details.carYear} />
                      <LoanDetailRow label="Vehicle Price" value={formatCurrency(currentLoan.details.vehiclePrice)} />
                      <LoanDetailRow label="Dealer Name" value={currentLoan.details.dealerName} />
                      <LoanDetailRow label="Repayment Term" value={currentLoan.details.repaymentTerm} />
                    </>
                  )}
                </div>
              </div>

              {/* Attachments */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3">Attachments</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span>Payslip</span>
                      </div>
                      <a href={currentLoan.details.payslipFilePath} target="_blank" rel="noopener noreferrer"
                        className="p-1 hover:bg-blue-100 text-blue-600 rounded-full" title="Download Payslip">
                        <Download size={18} />
                      </a>
                    </div>
                  </div>

                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span>Company ID</span>
                      </div>
                      <a href={currentLoan.details.companyIdFilePath} target="_blank" rel="noopener noreferrer"
                        className="p-1 hover:bg-blue-100 text-blue-600 rounded-full" title="Download Company ID">
                        <Download size={18} />
                      </a>
                    </div>
                  </div>

                  {currentLoan.type === "Housing Loan" && (
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <span>Property Documents</span>
                        </div>
                        <a href={currentLoan.details.propertyDocumentsFilePath} target="_blank" rel="noopener noreferrer"
                          className="p-1 hover:bg-blue-100 text-blue-600 rounded-full" title="Download Property Documents">
                          <Download size={18} />
                        </a>
                      </div>
                    </div>
                  )}

                  {currentLoan.type === "Car Loan" && (
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <span>Car Quotation</span>
                        </div>
                        <a href={currentLoan.details.carQuotationFilePath} target="_blank" rel="noopener noreferrer"
                          className="p-1 hover:bg-blue-100 text-blue-600 rounded-full" title="Download Car Quotation">
                          <Download size={18} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Close
              </button>
              <button type="button" onClick={() => {
                setShowViewModal(false);
                handleEdit(currentLoan);
              }}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Edit Loan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Loan Modal */}
      {showEditModal && currentLoan && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">Edit {currentLoan.type}</h3>
            </div>

            <form onSubmit={handleUpdateLoan}>
              <div className="p-6">
                {/* Employee Info (non-editable) and Loan Status (editable) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Employee Information</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Employee ID</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          value={currentLoan.employeeId} disabled />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          value={currentLoan.employeeName} disabled />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Position</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          value={currentLoan.position} disabled />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">Loan Status</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Status</label>
                        <select name="status" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          value={formData.status} onChange={handleInputChange} required>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Current Approval Level</label>
                        <select name="currentApprovalLevel" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          value={formData.currentApprovalLevel} onChange={handleInputChange} required>
                          <option value={1}>Level 1 - HR</option>
                          <option value={2}>Level 2 - Supervisor/Division Manager</option>
                          <option value={3}>Level 3 - Vice President</option>
                          <option value={4}>Level 4 - President</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loan specific details - Editable */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-3">Loan Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Common fields */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Loan Amount</label>
                      <input type="number" name="loanAmount" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.loanAmount} onChange={handleInputChange} required min={0} step={0.01} />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Repayment Term</label>
                      <input type="text" name="repaymentTerm" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.repaymentTerm} onChange={handleInputChange} required />
                    </div>

                    {/* Type-specific fields */}
                    {currentLoan.type === "Salary Loan" && (
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Loan Purpose</label>
                        <input type="text" name="loanPurpose" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          value={formData.loanPurpose} onChange={handleInputChange} required />
                      </div>
                    )}

                    {currentLoan.type === "Housing Loan" && (
                      <>
                        <div>
                          <label className="block text-gray-700 font-medium mb-1">Property Type</label>
                          <input type="text" name="propertyType" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={formData.propertyType} onChange={handleInputChange} required />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-medium mb-1">Property Address</label>
                          <input type="text" name="propertyAddress" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={formData.propertyAddress} onChange={handleInputChange} required />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-medium mb-1">Seller Name</label>
                          <input type="text" name="sellerName" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={formData.sellerName} onChange={handleInputChange} required />
                        </div>
                      </>
                    )}

                    {currentLoan.type === "Car Loan" && (
                      <>
                        <div>
                          <label className="block text-gray-700 font-medium mb-1">Car Make</label>
                          <input type="text" name="carMake" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={formData.carMake} onChange={handleInputChange} required />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-medium mb-1">Car Model</label>
                          <input type="text" name="carModel" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={formData.carModel} onChange={handleInputChange} required />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-medium mb-1">Car Year</label>
                          <input type="text" name="carYear" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={formData.carYear} onChange={handleInputChange} required />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-medium mb-1">Dealer Name</label>
                          <input type="text" name="dealerName" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={formData.dealerName} onChange={handleInputChange} required />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  Update Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentLoan && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">Confirm Deletion</h3>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle className="h-6 w-6" />
                <p className="font-medium">Are you sure you want to delete this loan?</p>
              </div>
              <p className="text-gray-600 mb-3">
                You are about to delete the following {currentLoan.type.toLowerCase()}:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="mb-1"><span className="font-medium">Employee:</span> {currentLoan.employeeName} ({currentLoan.employeeId})</p>
                <p className="mb-1"><span className="font-medium">Amount:</span> {formatCurrency(currentLoan.amount)}</p>
                <p><span className="font-medium">Submitted:</span> {formatDate(currentLoan.submittedAt)}</p>
              </div>
              <p className="text-gray-700 font-medium">This action cannot be undone.</p>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button type="button" onClick={handleDeleteLoan}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">
                Delete Loan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}