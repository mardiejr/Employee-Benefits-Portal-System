"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import EmployeeNavbar from "../components/EmployeeNavbar";
import useUserProfile from "../hooks/useUserProfile";
import useAuth from "../hooks/useAuth";
import { FileText, DollarSign, Home, Car, Calendar, Activity } from "lucide-react";

type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
type RequestType = 'Medical Reimbursement' | 'Housing Loan' | 'Car Loan' | 'Salary Loan' | 'House Booking' | 'Medical LOA';
type FilterType = RequestType | "All";

interface Approver {
  name: string; position: string; level: number;
  status: ApprovalStatus; timestamp?: string; comment?: string;
}

interface Attachment {
  id: string; filename: string; url: string; size: string;
}

interface Comment {
  id: string; author: string; role: string; content: string; timestamp: string;
}

interface ApprovalRequest {
  id: string; tokenNumber: string; type: RequestType; title: string;
  applicantName?: string; applicantPosition?: string;
  submittedDate: string; lastUpdated: string; amount?: number;
  status: ApprovalStatus; approvers: Approver[]; description: string;
  attachments?: Attachment[]; comments?: Comment[]; canApprove?: boolean;
  loanDetails?: any; bookingDetails?: any; medicalDetails?: any; loaDetails?: any;
}

const ApprovalPage = () => {
  const { handleApiError } = useAuth();
  const { userProfile, isApprover, loading: profileLoading } = useUserProfile();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'all'>('pending');
  const [comment, setComment] = useState("");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [filteredRequests, setFilteredRequests] = useState<ApprovalRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [requestsPerPage] = useState(8);
  const [open, setOpen] = useState(false);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState<FilterType>("All");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "All">("All");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [viewingFileName, setViewingFileName] = useState<string>('');

  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleViewFile = (url: string, fileName: string) => {
    setViewingFile(url);
    setViewingFileName(fileName);
  };

  const closeFileViewer = (e: React.MouseEvent) => {
    if ((e.target as HTMLDivElement).classList.contains('file-viewer-backdrop')) {
      setViewingFile(null);
      setViewingFileName('');
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIcon(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/approval/requests');

        if (!response.ok) {
          throw new Error(`Failed to fetch approval requests: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          console.log("Fetched requests:", data.requests);
          setRequests(data.requests || []);
        } else {
          throw new Error(data.error || 'Failed to fetch data');
        }
      } catch (error) {
        console.error('Error fetching approval requests:', error);
        toast.error('Failed to load requests. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  useEffect(() => {
    let filtered = [...requests];

    if (selectedTab === 'pending') {
      filtered = filtered.filter(req => req.status === 'Pending');
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    if (requestTypeFilter !== "All") {
      filtered = filtered.filter(req => req.type === requestTypeFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(req =>
        (req.tokenNumber && req.tokenNumber.toLowerCase().includes(term)) ||
        (req.applicantName && req.applicantName.toLowerCase().includes(term)) ||
        (req.type && req.type.toLowerCase().includes(term)) ||
        (req.description && req.description.toLowerCase().includes(term))
      );
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [requests, selectedTab, searchTerm, requestTypeFilter, statusFilter]);

  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = filteredRequests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);

  const handleOpenRequest = (request: ApprovalRequest) => setSelectedRequest(request);
  const handleCloseRequest = () => setSelectedRequest(null);

  const handleApprovalAction = (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const handleSubmitApproval = async () => {
    if (!selectedRequest || !approvalAction) return;

    if (approvalAction === 'reject' && (!comment || comment.trim().length < 5)) {
      toast.error('Please provide a detailed reason for rejection (at least 5 characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestType = selectedRequest.id.split('-')[0] + '-' + selectedRequest.id.split('-')[1];
      const actualId = selectedRequest.id.split('-').pop();

      const requestTypeMap: { [key: string]: string } = {
        'medical-reimbursement': 'medical-reimbursement',
        'housing-loan': 'housing-loan',
        'car-loan': 'car-loan',
        'salary-loan': 'salary-loan',
        'house-booking': 'house-booking',
        'medical-loa': 'medical-loa'
      };

      const apiRequestType = requestTypeMap[requestType];

      if (!apiRequestType || !actualId) {
        throw new Error('Invalid request type or ID');
      }

      const response = await fetch(`/api/approval/${apiRequestType}/${approvalAction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: actualId,
          comment: comment.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${approvalAction} request`);
      }

      setShowApprovalModal(false);
      setApprovalAction(null);
      setComment('');

      toast.success(`Request ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully`);

      const updatedRequests = requests.filter(req => req.id !== selectedRequest.id);
      setRequests(updatedRequests);

      setSelectedRequest(null);

    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount?: number) =>
    !amount ? 'â€"' : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const formatDate = (dateString: string) =>
    !dateString ? 'â€"' : new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

  const formatTimestamp = (dateString?: string) =>
    !dateString ? 'â€"' : new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

  const getStatusBadgeColor = (status: ApprovalStatus) => {
    const colors = {
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Pending': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRequestTypeIcon = (type: RequestType) => {
    switch (type) {
      case 'Medical Reimbursement':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'Housing Loan':
        return <Home className="h-5 w-5 text-indigo-600" />;
      case 'Car Loan':
        return <Car className="h-5 w-5 text-purple-600" />;
      case 'Salary Loan':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'House Booking':
        return <Calendar className="h-5 w-5 text-amber-600" />;
      case 'Medical LOA':
        return <Activity className="h-5 w-5 text-teal-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRequestTypeColor = (type: RequestType) => {
    const colors = {
      'Medical Reimbursement': 'bg-blue-50 text-blue-700 border-blue-300',
      'Housing Loan': 'bg-indigo-50 text-indigo-700 border-indigo-300',
      'Car Loan': 'bg-purple-50 text-purple-700 border-purple-300',
      'Salary Loan': 'bg-green-50 text-green-700 border-green-300',
      'House Booking': 'bg-amber-50 text-amber-700 border-amber-300',
      'Medical LOA': 'bg-teal-50 text-teal-700 border-teal-300'
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-300';
  };

  const getApprovalStage = (type: RequestType, level: number): string => {
    if (type === 'House Booking') {
      switch (level) {
        case 1: return "Awaiting HR Approval";
        case 2: return "Awaiting Supervisor/Division Manager Approval";
        default: return "Pending Review";
      }
    } else {
      switch (level) {
        case 1: return "Awaiting HR Approval";
        case 2: return "Awaiting Supervisor/Division Manager Approval";
        case 3: return "Awaiting Vice President Approval";
        case 4: return "Awaiting President Approval";
        default: return "Pending Review";
      }
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Toast notifications */}
      <Toaster position="top-right" />

      {/* Use the shared EmployeeNavbar component */}
      <EmployeeNavbar isApprover={isApprover} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Approval Requests</h1>
          <p className="text-gray-600">Manage and process pending approval requests</p>
        </div>

        {/* Filters and Tabs */}
        <div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4">
          {/* Tabs */}
          <div className="flex space-x-4 border-b border-gray-200 w-full lg:w-auto">
            <button
              onClick={() => setSelectedTab('pending')}
              className={`pb-2 px-1 font-medium ${selectedTab === 'pending'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Pending Approvals
            </button>
            <button
              onClick={() => setSelectedTab('all')}
              className={`pb-2 px-1 font-medium ${selectedTab === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              All Requests
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                type="search"
                className="block w-full p-2 pl-10 text-sm border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by ID, name, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Type Filter */}
            <select
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              value={requestTypeFilter}
              onChange={(e) => setRequestTypeFilter(e.target.value as FilterType)}
            >
              <option value="All">All Types</option>
              <option value="Medical Reimbursement">Medical Reimbursement</option>
              <option value="Housing Loan">Housing Loan</option>
              <option value="Car Loan">Car Loan</option>
              <option value="Salary Loan">Salary Loan</option>
              <option value="House Booking">House Booking</option>
              <option value="Medical LOA">Medical LOA</option>
            </select>

            {/* Status Filter */}
            <select
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ApprovalStatus | "All")}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <img src="/icons/empty.png" alt="No requests" className="w-40 h-40 mx-auto mb-6 opacity-60" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Approval Requests Found</h3>
            <p className="text-gray-500">
              {searchTerm || requestTypeFilter !== "All" || statusFilter !== "All"
                ? "Try adjusting your search or filters"
                : selectedTab === 'pending'
                  ? "There are no pending requests requiring your approval"
                  : "There are no approval requests in the system yet"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                            {getRequestTypeIcon(request.type)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{request.tokenNumber}</div>
                            <div className="text-xs text-gray-500">{request.title}</div>
                            <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-flex items-center ${getRequestTypeColor(request.type)}`}>
                              <span>{request.type}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request.applicantName || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{request.applicantPosition || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(request.submittedDate)}</div>
                        <div className="text-xs text-gray-500">Updated: {formatDate(request.lastUpdated)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.amount ? formatCurrency(request.amount) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleOpenRequest(request)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstRequest + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(indexOfLastRequest, filteredRequests.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredRequests.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* Page Numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                        <button
                          key={number}
                          onClick={() => setCurrentPage(number)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {number}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white z-10 flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRequestTypeColor(selectedRequest.type)}`}>
                  {getRequestTypeIcon(selectedRequest.type)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedRequest.title}</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{selectedRequest.tokenNumber}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeColor(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseRequest}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Request Details */}
                <div className="md:col-span-2 space-y-6">
                  {/* Basic Information */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">Request Details</h3>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Submitted on {formatDate(selectedRequest.submittedDate)}
                      </p>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Request Type</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedRequest.type}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Status</dt>
                          <dd className="mt-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(selectedRequest.status)}`}>
                              {selectedRequest.status}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Applicant</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {selectedRequest.applicantName || 'N/A'}
                            {selectedRequest.applicantPosition && (
                              <div className="text-xs text-gray-500">{selectedRequest.applicantPosition}</div>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Request Amount</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {selectedRequest.amount ? formatCurrency(selectedRequest.amount) : 'N/A'}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Description</dt>
                          <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                            {selectedRequest.description}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {selectedRequest.loanDetails && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Loan Details</h3>
                      </div>
                      <div className="px-4 py-5 sm:p-6">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                          {/* Housing Loan details */}
                          {selectedRequest.type === 'Housing Loan' && selectedRequest.loanDetails && (
                            <>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Property Type</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.propertyType}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Property Value</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {formatCurrency(selectedRequest.loanDetails.propertyValue)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Property Address</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.propertyAddress}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Loan Amount</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {formatCurrency(selectedRequest.loanDetails.loanAmount)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Repayment Term</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.repaymentTerm}</dd>
                              </div>
                              {selectedRequest.loanDetails.sellerName && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">Seller Name</dt>
                                  <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.sellerName}</dd>
                                </div>
                              )}
                              {selectedRequest.loanDetails.monthlySalary && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">Monthly Salary</dt>
                                  <dd className="mt-1 text-sm text-gray-900">
                                    {formatCurrency(selectedRequest.loanDetails.monthlySalary)}
                                  </dd>
                                </div>
                              )}
                            </>
                          )}

                          {/* Car Loan details */}
                          {selectedRequest.type === 'Car Loan' && selectedRequest.loanDetails && (
                            <>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Car Make</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.carMake}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Car Model</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.carModel}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Car Year</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.carYear}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Vehicle Price</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {formatCurrency(selectedRequest.loanDetails.vehiclePrice)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Dealer Name</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.dealerName}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Loan Amount</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {formatCurrency(selectedRequest.loanDetails.loanAmount)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Repayment Term</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.repaymentTerm}</dd>
                              </div>
                              {selectedRequest.loanDetails.monthlySalary && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">Monthly Salary</dt>
                                  <dd className="mt-1 text-sm text-gray-900">
                                    {formatCurrency(selectedRequest.loanDetails.monthlySalary)}
                                  </dd>
                                </div>
                              )}
                            </>
                          )}

                          {/* Salary Loan details */}
                          {selectedRequest.type === 'Salary Loan' && selectedRequest.loanDetails && (
                            <>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Loan Purpose</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.loanPurpose}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Loan Amount</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {formatCurrency(selectedRequest.loanDetails.loanAmount)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Repayment Term</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.repaymentTerm}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Monthly Salary</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {formatCurrency(selectedRequest.loanDetails.monthlySalary)}
                                </dd>
                              </div>
                              {selectedRequest.loanDetails.contactNumber && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">Contact Number</dt>
                                  <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loanDetails.contactNumber}</dd>
                                </div>
                              )}
                            </>
                          )}
                        </dl>
                      </div>
                    </div>
                  )}

                  {/* Medical LOA Details */}
                  {selectedRequest.type === 'Medical LOA' && selectedRequest.loaDetails && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Medical LOA Details</h3>
                      </div>
                      <div className="px-4 py-5 sm:p-6">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Hospital Name</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loaDetails.hospitalName}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Hospital Address</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loaDetails.hospitalAddress}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Hospital City</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loaDetails.hospitalCity}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Hospital Province</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loaDetails.hospitalProvince}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Hospital Region</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loaDetails.hospitalRegion}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Visit Date</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {selectedRequest.loaDetails.visitDate ? formatDate(selectedRequest.loaDetails.visitDate) : 'N/A'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Reason Type</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loaDetails.reasonType}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Patient Complaint</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loaDetails.patientComplaint}</dd>
                          </div>
                          {selectedRequest.loaDetails.preferredDoctor && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Preferred Doctor</dt>
                              <dd className="mt-1 text-sm text-gray-900">{selectedRequest.loaDetails.preferredDoctor}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  )}

                  {/* House Booking Details */}
                  {selectedRequest.type === 'House Booking' && selectedRequest.bookingDetails && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Staffhouse Booking Details</h3>
                      </div>
                      <div className="px-4 py-5 sm:p-6">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Property Name</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.bookingDetails.propertyName}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Property Location</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.bookingDetails.propertyLocation}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Number of Guests</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.bookingDetails.numberOfGuests}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Nature of Stay</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {selectedRequest.bookingDetails.natureOfStay === 'official' ? 'Official Business' : 'Personal'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Check-in Date</dt>
                            <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedRequest.bookingDetails.checkinDate)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Check-in Time</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.bookingDetails.checkinTime}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Check-out Date</dt>
                            <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedRequest.bookingDetails.checkoutDate)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Check-out Time</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.bookingDetails.checkoutTime}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Reason for Use</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedRequest.bookingDetails.reasonForUse}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  )}

                  {/* Attachments Section */}
                  {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Attachments</h3>
                      </div>
                      <div className="px-4 py-5 sm:p-6">
                        <ul className="divide-y divide-gray-200">
                          {selectedRequest.attachments.map((attachment) => (
                            <li key={attachment.id} className="py-3 flex justify-between items-center">
                              <div className="flex items-center">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                </svg>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{attachment.filename}</p>
                                  <p className="text-xs text-gray-500">{attachment.size}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewFile(attachment.url, attachment.filename)}
                                className="ml-4 text-sm font-medium text-blue-600 hover:text-blue-500"
                              >
                                View
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Approval Status & Comments */}
                <div className="space-y-6">
                  {/* Approval Progress */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">Approval Status</h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                      <ol className="relative border-l border-gray-200 ml-3">
                        {(selectedRequest.type === 'House Booking'
                          ? selectedRequest.approvers.filter(approver => approver.level <= 2)
                          : selectedRequest.approvers
                        ).map((approver, index) => (
                          <li key={index} className="mb-6 ml-6 last:mb-0">
                            <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ${approver.status === 'Approved'
                              ? 'bg-green-100'
                              : approver.status === 'Rejected'
                                ? 'bg-red-100'
                                : 'bg-gray-100'
                              }`}>
                              {approver.status === 'Approved' && (
                                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                </svg>
                              )}
                              {approver.status === 'Rejected' && (
                                <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                                </svg>
                              )}
                              {approver.status === 'Pending' && (
                                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                              )}
                            </span>
                            <h3 className="flex items-center text-sm font-semibold text-gray-900">
                              {approver.name}
                              <span className={`ml-2 text-xs font-normal rounded-full px-2 py-0.5 ${approver.status === 'Approved'
                                ? 'bg-green-100 text-green-800'
                                : approver.status === 'Rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {approver.status}
                              </span>
                            </h3>
                            <p className="text-xs text-gray-500">{approver.position}</p>
                            {approver.timestamp && (
                              <p className="text-xs text-gray-500 mt-1">{formatTimestamp(approver.timestamp)}</p>
                            )}
                            {approver.comment && (
                              <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded-md border border-gray-100">
                                {approver.comment}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {selectedRequest.comments && selectedRequest.comments.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Comments</h3>
                      </div>
                      <div className="px-4 py-5 sm:p-6">
                        <div className="space-y-3">
                          {selectedRequest.comments.map((comment) => (
                            <div key={comment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{comment.author}</p>
                                  <p className="text-xs text-gray-500">{comment.role}</p>
                                </div>
                                <p className="text-xs text-gray-500">{formatTimestamp(comment.timestamp)}</p>
                              </div>
                              <p className="text-sm text-gray-800">{comment.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Approval actions */}
                  {selectedRequest.status === 'Pending' && (
                    <div className="mt-8 flex justify-end gap-4">
                      <button
                        onClick={() => handleApprovalAction('reject')}
                        className="px-4 py-2 bg-white border border-red-500 text-red-500 rounded-md hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Reject Request
                      </button>
                      <button
                        onClick={() => handleApprovalAction('approve')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Approve Request
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval/Rejection Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${approvalAction === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                {approvalAction === 'approve' ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {approvalAction === 'approve' ? 'Approve Request' : 'Reject Request'}
                </h3>
                <p className="text-sm text-gray-500">
                  {approvalAction === 'approve'
                    ? 'Are you sure you want to approve this request?'
                    : 'Please provide a reason for rejection.'
                  }
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {approvalAction === 'approve' ? 'Comments (Optional)' : 'Reason for Rejection'}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={approvalAction === 'approve' ? 'Add any comments here...' : 'Please provide a reason for rejection...'}
                required={approvalAction === 'reject'}
              ></textarea>
              {approvalAction === 'reject' && !comment && (
                <p className="mt-1 text-xs text-red-600">A reason is required for rejection</p>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalAction(null);
                  setComment('');
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitApproval}
                disabled={approvalAction === 'reject' && !comment || isSubmitting}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${approvalAction === 'approve'
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                  } ${(approvalAction === 'reject' && !comment) || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : approvalAction === 'approve' ? 'Approve' : 'Reject'
                }
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* File Viewer Modal */}
      {viewingFile && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center file-viewer-backdrop backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onClick={closeFileViewer}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <button
              className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 z-[61]"
              onClick={() => {
                setViewingFile(null);
                setViewingFileName('');
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="bg-white rounded-lg shadow-2xl p-2">
              <div className="p-2 text-center mb-2">
                <h3 className="text-lg font-medium text-gray-900">{viewingFileName}</h3>
              </div>
              {viewingFile.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <img src={viewingFile} alt={viewingFileName} className="max-h-[70vh] object-contain" />
              ) : viewingFile.match(/\.(pdf)$/i) ? (
                <iframe src={viewingFile} title={viewingFileName} className="w-full h-[70vh]" />
              ) : (
                <div className="flex items-center justify-center h-[30vh]">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-gray-600">File preview not available</p>
                    
                      href={viewingFile}
                      download
                      className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    <a>
                      Download File
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalPage;