"use client";
import { useState, useEffect } from "react";
import { FileText, Activity, Search, Check, X, Eye, Clock, Download, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

type BenefitType = "all" | "medical-reimbursement" | "medical-loa";
type BenefitStatus = "all" | "Pending" | "Approved" | "Rejected";

interface Benefit {
  id: string;
  type: string;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  amount?: number;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  updatedAt: string;
  currentApprovalLevel: number;
  approvalStage: string;
  details: any;
}

const BenefitDetailRow = ({ label, value }: { label: string, value: any }) => (
  <div className="grid grid-cols-2 py-2 border-b border-gray-100">
    <div className="text-gray-600 font-medium">{label}</div>
    <div className="text-gray-900">{value}</div>
  </div>
);

export default function BenefitsManagementPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [filteredBenefits, setFilteredBenefits] = useState<Benefit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [benefitTypeFilter, setBenefitTypeFilter] = useState<BenefitType>("all");
  const [statusFilter, setStatusFilter] = useState<BenefitStatus>("all");
  const [sortField, setSortField] = useState<keyof Benefit>("submittedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentBenefit, setCurrentBenefit] = useState<Benefit | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { fetchBenefits(); }, []);
  useEffect(() => { applyFilters(); }, [benefits, searchTerm, benefitTypeFilter, statusFilter, sortField, sortDirection]);

  const fetchBenefits = async () => {
    setIsLoading(true);
    try {
      const [medicalReimbursementRes, medicalLoaRes] = await Promise.all([
        fetch('/api/admin/benefits?type=medical-reimbursement'),
        fetch('/api/admin/benefits?type=medical-loa')
      ]);
      
      const [reimbursementData, loaData] = await Promise.all([
        medicalReimbursementRes.json(),
        medicalLoaRes.json()
      ]);
      
      const allBenefits = [
        ...(reimbursementData.benefits || []).map(formatMedicalReimbursement),
        ...(loaData.benefits || []).map(formatMedicalLOA)
      ];
      
      setBenefits(allBenefits);
    } catch (error) {
      console.error("Error fetching benefits:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format benefit data
  const formatMedicalReimbursement = (benefit: any): Benefit => ({
    id: `medical-reimbursement-${benefit.id}`,
    type: "Medical Reimbursement",
    employeeId: benefit.employee_id,
    employeeName: `${benefit.first_name} ${benefit.last_name}`,
    position: benefit.position || "",
    department: benefit.department || "",
    amount: parseFloat(benefit.total_amount),
    status: benefit.status,
    submittedAt: benefit.submitted_at,
    updatedAt: benefit.updated_at,
    currentApprovalLevel: benefit.current_approval_level,
    approvalStage: getApprovalStage(benefit.current_approval_level),
    details: {
      admissionDate: benefit.admission_date,
      dischargeDate: benefit.discharge_date,
      receiptFilePath: benefit.receipt_file_path,
      certificateFilePath: benefit.certificate_file_path,
    }
  });
  
  const formatMedicalLOA = (benefit: any): Benefit => ({
    id: `medical-loa-${benefit.id}`,
    type: "Medical LOA",
    employeeId: benefit.employee_id,
    employeeName: `${benefit.first_name} ${benefit.last_name}`,
    position: benefit.position || "",
    department: benefit.department || "",
    status: benefit.status,
    submittedAt: benefit.submitted_at,
    updatedAt: benefit.updated_at,
    currentApprovalLevel: benefit.current_approval_level,
    approvalStage: getApprovalStage(benefit.current_approval_level),
    details: {
      hospitalName: benefit.hospital_name,
      hospitalAddress: benefit.hospital_address,
      hospitalCity: benefit.hospital_city,
      hospitalProvince: benefit.hospital_province,
      hospitalRegion: benefit.hospital_region,
      visitDate: benefit.visit_date,
      reasonType: benefit.reason_type,
      patientComplaint: benefit.patient_complaint,
      preferredDoctor: benefit.preferred_doctor,
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
    let filtered = [...benefits];
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(benefit => 
        benefit.employeeId.toLowerCase().includes(term) || 
        benefit.employeeName.toLowerCase().includes(term) ||
        benefit.position.toLowerCase().includes(term) ||
        benefit.department.toLowerCase().includes(term)
      );
    }
    
    // Apply benefit type filter
    if (benefitTypeFilter !== "all") {
      const typeMap = { 
        "medical-reimbursement": "Medical Reimbursement", 
        "medical-loa": "Medical LOA" 
      };
      filtered = filtered.filter(benefit => benefit.type === typeMap[benefitTypeFilter as keyof typeof typeMap]);
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(benefit => benefit.status === statusFilter);
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
    
    setFilteredBenefits(filtered);
  };
  
  // Event handlers
  const handleSort = (field: keyof Benefit) => {
    setSortDirection(field === sortField ? (sortDirection === "asc" ? "desc" : "asc") : "asc");
    setSortField(field);
  };

  const clearMessages = () => {
    setSuccessMessage("");
    setErrorMessage("");
  };
  
  const handleView = (benefit: Benefit) => {
    setCurrentBenefit(benefit);
    setShowViewModal(true);
  };

  // UI Helper functions
  const renderBenefitIcon = (type: string) => {
    switch (type) {
      case "Medical Reimbursement": return <FileText className="h-5 w-5 text-blue-500" />;
      case "Medical LOA": return <Activity className="h-5 w-5 text-teal-500" />;
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

  const formatCurrency = (amount?: number) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-PH", {
      style: "currency", currency: "PHP", minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Benefits Management</h2>
        <p className="text-gray-600">View, manage, and process benefit requests from all employees</p>
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
              value={benefitTypeFilter}
              onChange={(e) => setBenefitTypeFilter(e.target.value as BenefitType)}
            >
              <option value="all">All Benefit Types</option>
              <option value="medical-reimbursement">Medical Reimbursement</option>
              <option value="medical-loa">Medical LOA</option>
            </select>
            
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BenefitStatus)}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Benefits Table */}
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
                <th className="px-4 py-3 text-left text-sm font-medium">Department</th>
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
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">Loading benefit data...</td></tr>
              ) : filteredBenefits.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">No benefit requests found</td></tr>
              ) : (
                filteredBenefits.map((benefit) => (
                  <tr key={benefit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {renderBenefitIcon(benefit.type)}
                        <span>{benefit.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{benefit.employeeId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{benefit.employeeName}</td>
                    <td className="px-4 py-3 text-sm">{benefit.position}</td>
                    <td className="px-4 py-3 text-sm">{benefit.department}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(benefit.amount)}</td>
                    <td className="px-4 py-3">{renderStatusBadge(benefit.status)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(benefit.submittedAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      {benefit.status === "Approved" ? (
                        <span className="text-green-600">Approved</span>
                      ) : benefit.status === "Rejected" ? (
                        <span className="text-red-600">Rejected</span>
                      ) : (
                        <span className="text-blue-600">{benefit.approvalStage}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex justify-center">
                        <button onClick={() => handleView(benefit)} className="p-1 rounded-full hover:bg-blue-100 text-blue-600" title="View Details">
                          <Eye size={18} />
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
          Showing {filteredBenefits.length} of {benefits.length} benefit requests
        </div>
      </div>

      {/* View Benefit Modal */}
      {showViewModal && currentBenefit && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {renderBenefitIcon(currentBenefit.type)}
                <h3 className="text-xl font-semibold text-gray-800">{currentBenefit.type} Details</h3>
              </div>
              <div>{renderStatusBadge(currentBenefit.status)}</div>
            </div>
            
            <div className="p-6">
              {/* Employee Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-lg font-semibold mb-3">Employee Information</h4>
                  <div className="space-y-1">
                    <BenefitDetailRow label="Employee ID" value={currentBenefit.employeeId} />
                    <BenefitDetailRow label="Name" value={currentBenefit.employeeName} />
                    <BenefitDetailRow label="Position" value={currentBenefit.position} />
                    <BenefitDetailRow label="Department" value={currentBenefit.department} />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-3">Request Information</h4>
                  <div className="space-y-1">
                    {currentBenefit.amount && <BenefitDetailRow label="Amount" value={formatCurrency(currentBenefit.amount)} />}
                    <BenefitDetailRow label="Submitted Date" value={formatDate(currentBenefit.submittedAt)} />
                    <BenefitDetailRow label="Last Updated" value={formatDate(currentBenefit.updatedAt)} />
                    <BenefitDetailRow 
                      label="Approval Stage" 
                      value={currentBenefit.status === "Approved" ? "Fully Approved" : 
                             currentBenefit.status === "Rejected" ? "Rejected" : 
                             currentBenefit.approvalStage} 
                    />
                  </div>
                </div>
              </div>
              
              {/* Benefit specific details */}
              <div>
                <h4 className="text-lg font-semibold mb-3">Request Specific Details</h4>
                <div className="space-y-1">
                  {currentBenefit.type === "Medical Reimbursement" && (
                    <>
                      <BenefitDetailRow label="Admission Date" value={formatDate(currentBenefit.details.admissionDate)} />
                      {currentBenefit.details.dischargeDate && (
                        <BenefitDetailRow label="Discharge Date" value={formatDate(currentBenefit.details.dischargeDate)} />
                      )}
                    </>
                  )}
                  
                  {currentBenefit.type === "Medical LOA" && (
                    <>
                      <BenefitDetailRow label="Hospital Name" value={currentBenefit.details.hospitalName} />
                      <BenefitDetailRow 
                        label="Hospital Address" 
                        value={`${currentBenefit.details.hospitalAddress}, ${currentBenefit.details.hospitalCity}, ${currentBenefit.details.hospitalProvince}, ${currentBenefit.details.hospitalRegion}`} 
                      />
                      <BenefitDetailRow label="Visit Date" value={formatDate(currentBenefit.details.visitDate)} />
                      <BenefitDetailRow label="Reason Type" value={currentBenefit.details.reasonType} />
                      <BenefitDetailRow label="Patient Complaint" value={currentBenefit.details.patientComplaint} />
                      <BenefitDetailRow label="Preferred Doctor" value={currentBenefit.details.preferredDoctor || "None specified"} />
                    </>
                  )}
                </div>
              </div>
              
              {/* Attachments for Medical Reimbursement */}
              {currentBenefit.type === "Medical Reimbursement" && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-3">Attachments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <span>Receipt</span>
                        </div>
                        <a href={currentBenefit.details.receiptFilePath} target="_blank" rel="noopener noreferrer"
                          className="p-1 hover:bg-blue-100 text-blue-600 rounded-full" title="Download Receipt">
                          <Download size={18} />
                        </a>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <span>Medical Certificate</span>
                        </div>
                        <a href={currentBenefit.details.certificateFilePath} target="_blank" rel="noopener noreferrer"
                          className="p-1 hover:bg-blue-100 text-blue-600 rounded-full" title="Download Certificate">
                          <Download size={18} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}