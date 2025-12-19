"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";
import useAuth from "../hooks/useAuth";
import EmployeeNavbar from "../components/EmployeeNavbar";
import useUserProfile from "../hooks/useUserProfile";
import { Download, ChevronUp } from "lucide-react";

type TicketStatus = 'Approved' | 'Pending' | 'Rejected' | 'Cancelled';
type TicketType = 'Medical LOA' | 'Medical Reimbursement' | 'Car Loan' | 'Salary Loan' | 'Housing Loan' | 'House Booking';
type ApproverRole = 'HR Staff' | 'HR Manager' | 'HR Senior Manager' | 'Supervisor' | 'Division Manager' | 'Vice President' | 'President';

interface Attachment {
  id: string;
  filename: string;
  url: string;
  size?: string;
}

interface Approver {
  name: string;
  position: ApproverRole;
  level: number;
  status?: 'Approved' | 'Pending' | 'Rejected';
  timestamp?: string;
  comment?: string;
}

interface Comment {
  id: string;
  author: string;
  role: string;
  content: string;
  timestamp: string;
}

interface Ticket {
  id: string;
  tokenNumber: string;
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  submittedDate: string;
  lastUpdated: string;
  viewedDate?: string;
  approvalStampedDate?: string;
  attachments?: Attachment[];
  approvers: Approver[];
  comments?: Comment[];
  isPinned?: boolean;
  qrCode?: string;
  loanDetails?: {
    propertyType?: string;
    propertyAddress?: string;
    propertyValue?: number;
    loanAmount: number;
    repaymentTerm: string;
    sellerName?: string;
    carMake?: string;
    carModel?: string;
    carYear?: string;
    vehiclePrice?: number;
    dealerName?: string;
    loanPurpose?: string;
  };
  reimbursementDetails?: {
    firstName: string;
    lastName: string;
    patientType: string;
    amountClaimed: number;
    admissionDate: string;
    dischargeDate?: string | null;
  };
  bookingDetails?: {
    firstName: string;
    lastName: string;
    propertyName: string;
    propertyLocation: string;
    numberOfGuests: number;
    checkinDate: string;
    checkinTime: string;
    checkoutDate: string;
    checkoutTime: string;
    natureOfStay: string;
    reasonForUse: string;
  };
  loaDetails?: {
    hospitalName: string;
    hospitalAddress: string;
    hospitalCity: string;
    hospitalProvince: string;
    hospitalRegion: string;
    visitDate: string;
    reasonType: string;
    patientComplaint: string;
    preferredDoctor: string;
  };
}

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

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

export default function StatusPage() {
  const { handleApiError } = useAuth();
  const { isApprover } = useUserProfile();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [viewingFileName, setViewingFileName] = useState<string>('');

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

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/status/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
      } else {
        console.error('Failed to fetch tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = (ticketId: string) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, isPinned: !ticket.isPinned } : ticket
      )
    );
  };

  const handleAddComment = async () => {
    if (!selectedTicket) return;
    if (!newComment.trim()) {
      setCommentError('Comment cannot be empty');
      return;
    }
    if (newComment.length < 5) {
      setCommentError('Comment must be at least 5 characters long');
      return;
    }
    if (newComment.length > 500) {
      setCommentError('Comment must not exceed 500 characters');
      return;
    }
    try {
      const response = await fetch('/api/status/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: selectedTicket.id, comment: newComment }),
      });
      if (response.ok) {
        const result = await response.json();
        const comment: Comment = {
          id: result.commentId,
          author: result.author,
          role: result.role,
          content: newComment,
          timestamp: new Date().toISOString()
        };
        setTickets(prevTickets =>
          prevTickets.map(ticket =>
            ticket.id === selectedTicket.id ? { ...ticket, comments: [...(ticket.comments || []), comment] } : ticket
          )
        );
        setSelectedTicket(prev => prev ? { ...prev, comments: [...(prev.comments || []), comment] } : null);
        setNewComment('');
        setCommentError('');
      } else {
        setCommentError('Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      setCommentError('An error occurred while posting comment');
    }
  };

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsSubmittingCancel(true);
    setCancelError('');

    try {
      const bookingIdStr = selectedTicket.id.split('-').pop();

      if (!bookingIdStr) {
        throw new Error('Invalid booking ID format');
      }

      const response = await fetch('/api/house-booking/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: parseInt(bookingIdStr),
          cancelReason
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowCancelModal(false);
        setTickets(prevTickets =>
          prevTickets.map(ticket =>
            ticket.id === selectedTicket.id ? { ...ticket, status: 'Cancelled' } : ticket
          )
        );

        if (selectedTicket) {
          setSelectedTicket({
            ...selectedTicket,
            status: 'Cancelled'
          });
        }

        alert('Booking has been successfully cancelled');
        closeModal();
      } else {
        setCancelError(result.error || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setCancelError('An error occurred. Please try again.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'Approved': return 'bg-green-500 text-white';
      case 'Pending': return 'bg-gray-400 text-white';
      case 'Rejected': return 'bg-red-500 text-white';
      case 'Cancelled': return 'bg-orange-500 text-white';
      default: return 'bg-gray-300 text-gray-600';
    }
  };

  const getStatusBadgeColor = (status?: 'Approved' | 'Pending' | 'Rejected') => {
    switch (status) {
      case 'Approved': return 'bg-green-500 text-white';
      case 'Pending': return 'bg-gray-400 text-white';
      case 'Rejected': return 'bg-red-500 text-white';
      default: return 'bg-gray-300 text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}, ${dateStr}, ${time}`;
  };

  const downloadQRCode = (qrDataURL: string | undefined, tokenNumber: string) => {
    if (!qrDataURL) return;

    const link = document.createElement('a');
    link.href = qrDataURL;
    link.download = `${tokenNumber}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isEligibleForPdf = (ticket: Ticket) => {
    return (
      ticket.status === 'Approved' &&
      (ticket.type === 'Salary Loan' ||
        ticket.type === 'Car Loan' ||
        ticket.type === 'Housing Loan' ||
        ticket.type === 'Medical Reimbursement')
    );
  };

  const handlePdfDownload = async (ticketId: string) => {
    setIsGeneratingPdf(true);
    try {
      window.open(`/api/status/generate-approval-pdf?ticketId=${ticketId}`, '_blank');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const sortedTickets = [...tickets].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime();
  });

  const filteredTickets = filterStatus === 'all' ? sortedTickets : sortedTickets.filter(ticket => ticket.status === filterStatus);

  const closeModal = () => {
    setSelectedTicket(null);
    setNewComment('');
    setCommentError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <EmployeeNavbar isApprover={isApprover} />

      <main className="flex-grow px-4 sm:px-6 md:px-8 py-6 md:py-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">My Status</h1>
            <p className="text-sm md:text-base text-gray-600">Track the status of your submitted tickets and requests</p>
          </div>

          <div className="flex overflow-x-auto space-x-2 mb-6 border-b border-gray-200 pb-2">
            {['all', 'Pending', 'Approved', 'Rejected'].map((status) => (
              <button key={status} onClick={() => setFilterStatus(status as any)} className={`px-4 md:px-6 py-2 md:py-3 font-medium transition-colors whitespace-nowrap text-sm md:text-base ${filterStatus === status ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>
                {status === 'all' ? 'All Tickets' : status}
              </button>
            ))}
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-base md:text-lg">No tickets found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow relative">
                  <button onClick={() => togglePin(ticket.id)} className="absolute top-3 right-3 md:top-4 md:right-4 p-2 hover:bg-gray-100 rounded-full transition-colors" title={ticket.isPinned ? "Unpin ticket" : "Pin ticket"}>
                    <svg className={`w-4 h-4 md:w-5 md:h-5 ${ticket.isPinned ? 'fill-yellow-500' : 'fill-gray-400'}`} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  </button>
                  <div className="flex justify-between items-start mb-4 pr-10 md:pr-12">
                    <div className="flex-grow">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                        <h3 className="text-lg md:text-xl font-semibold text-gray-800">{ticket.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)} w-fit`}>{ticket.status}</span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{ticket.description}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs md:text-sm text-gray-500">
                        <span className="flex items-center"><span className="font-medium mr-1">Type:</span>{ticket.type}</span>
                        <span className="flex items-center"><span className="font-medium mr-1">Token:</span>{ticket.tokenNumber}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-4 border-t border-gray-200 space-y-3 sm:space-y-0">
                    <div className="text-xs md:text-sm text-gray-500 space-y-1 sm:space-y-0">
                      <span className="block sm:inline sm:mr-4"><span className="font-medium">Submitted:</span> {formatDate(ticket.submittedDate)}</span>
                      <span className="block sm:inline"><span className="font-medium">Last Updated:</span> {formatDate(ticket.lastUpdated)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setSelectedTicket(ticket)} className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium">View Details</button>

                      {isEligibleForPdf(ticket) && (
                        <button
                          onClick={() => handlePdfDownload(ticket.id)}
                          disabled={isGeneratingPdf}
                          className="px-3 md:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs md:text-sm font-medium flex items-center gap-1"
                        >
                          <Download className="w-3 h-3 md:w-4 md:h-4" />
                          {isGeneratingPdf ? 'Processing...' : 'Certificate'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedTicket && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col md:flex-row my-4">
            <div className="w-full md:w-2/3 p-4 sm:p-6 md:p-8 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-200">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center flex-wrap gap-2">
                  <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  </button>

                  {isEligibleForPdf(selectedTicket) && (
                    <button
                      onClick={() => handlePdfDownload(selectedTicket.id)}
                      disabled={isGeneratingPdf}
                      className="px-2 md:px-3 py-1.5 bg-gray-700 text-white rounded-md text-xs md:text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">{isGeneratingPdf ? 'Processing...' : 'Download Certificate'}</span>
                      <span className="sm:hidden">{isGeneratingPdf ? 'Processing...' : 'Certificate'}</span>
                    </button>
                  )}
                </div>

                <button onClick={() => togglePin(selectedTicket.id)} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title={selectedTicket.isPinned ? "Unpin ticket" : "Pin ticket"}>
                  <svg className={`w-5 h-5 md:w-6 md:h-6 ${selectedTicket.isPinned ? 'fill-yellow-500' : 'fill-gray-400'}`} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{selectedTicket.title}</h2>
                <p className="text-xs md:text-sm text-gray-600 mb-4">Date reported: {formatDate(selectedTicket.submittedDate)}</p>
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm md:text-base">Description</h3>
                  <p className="text-gray-700 text-sm md:text-base">{selectedTicket.description}</p>
                </div>

                {selectedTicket.reimbursementDetails && (
                  <div className="mb-4 bg-white rounded-lg p-3 md:p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Financial Aid Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                      <div><span className="text-gray-600">First Name:</span><p className="font-medium text-gray-800">{selectedTicket.reimbursementDetails.firstName}</p></div>
                      <div><span className="text-gray-600">Last Name:</span><p className="font-medium text-gray-800">{selectedTicket.reimbursementDetails.lastName}</p></div>
                      <div><span className="text-gray-600">Patient Type:</span><p className="font-medium text-gray-800 capitalize">{selectedTicket.reimbursementDetails.patientType === 'inpatient' ? 'In-patient' : 'Out-patient'}</p></div>
                      <div><span className="text-gray-600">Amount Claimed:</span><p className="font-medium text-gray-800">₱{selectedTicket.reimbursementDetails.amountClaimed.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                      <div><span className="text-gray-600">{selectedTicket.reimbursementDetails.patientType === 'inpatient' ? 'Date of Admission' : 'Date of Consultation'}:</span><p className="font-medium text-gray-800">{new Date(selectedTicket.reimbursementDetails.admissionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
                      {selectedTicket.reimbursementDetails.patientType === 'inpatient' && selectedTicket.reimbursementDetails.dischargeDate ? (
                        <div><span className="text-gray-600">Date of Discharge:</span><p className="font-medium text-gray-800">{new Date(selectedTicket.reimbursementDetails.dischargeDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
                      ) : selectedTicket.reimbursementDetails.patientType === 'inpatient' ? (
                        <div><span className="text-gray-600">Date of Discharge:</span><p className="font-medium text-gray-400 italic">Not provided</p></div>
                      ) : null}
                    </div>
                  </div>
                )}

                {selectedTicket.bookingDetails && (
                  <div className="mb-4 bg-white rounded-lg p-3 md:p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Staffhouse Booking Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                      <div><span className="text-gray-600">First Name:</span><p className="font-medium text-gray-800">{selectedTicket.bookingDetails.firstName}</p></div>
                      <div><span className="text-gray-600">Last Name:</span><p className="font-medium text-gray-800">{selectedTicket.bookingDetails.lastName}</p></div>
                      <div className="col-span-1 sm:col-span-2"><span className="text-gray-600">Property:</span><p className="font-medium text-gray-800">{selectedTicket.bookingDetails.propertyName}</p><p className="text-xs text-gray-500">{selectedTicket.bookingDetails.propertyLocation}</p></div>
                      <div><span className="text-gray-600">Number of Guests:</span><p className="font-medium text-gray-800">{selectedTicket.bookingDetails.numberOfGuests}</p></div>
                      <div><span className="text-gray-600">Check-in:</span><p className="font-medium text-gray-800">{new Date(selectedTicket.bookingDetails.checkinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p><p className="text-xs text-gray-500">{selectedTicket.bookingDetails.checkinTime}</p></div>
                      <div><span className="text-gray-600">Check-out:</span><p className="font-medium text-gray-800">{new Date(selectedTicket.bookingDetails.checkoutDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p><p className="text-xs text-gray-500">{selectedTicket.bookingDetails.checkoutTime}</p></div>
                    </div>
                  </div>
                )}

                {selectedTicket.type === 'House Booking' && selectedTicket.status === 'Approved' && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="mt-2 px-3 py-1.5 text-xs md:text-sm bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}

                {selectedTicket.loanDetails && (
                  <div className="mb-4 bg-white rounded-lg p-3 md:p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Loan Details</h3>
                    {selectedTicket.type === 'Housing Loan' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                        <div><span className="text-gray-600">Property Type:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.propertyType}</p></div>
                        <div><span className="text-gray-600">Property Value:</span><p className="font-medium text-gray-800">₱{selectedTicket.loanDetails.propertyValue?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                        <div className="col-span-1 sm:col-span-2"><span className="text-gray-600">Property Address:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.propertyAddress}</p></div>
                        <div><span className="text-gray-600">Seller Name:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.sellerName}</p></div>
                        <div><span className="text-gray-600">Loan Amount:</span><p className="font-medium text-gray-800">₱{selectedTicket.loanDetails.loanAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                        <div><span className="text-gray-600">Repayment Term:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.repaymentTerm}</p></div>
                      </div>
                    ) : selectedTicket.type === 'Car Loan' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                        <div><span className="text-gray-600">Car Make:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.carMake}</p></div>
                        <div><span className="text-gray-600">Car Model:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.carModel}</p></div>
                        <div><span className="text-gray-600">Year Model:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.carYear}</p></div>
                        <div><span className="text-gray-600">Vehicle Price:</span><p className="font-medium text-gray-800">₱{selectedTicket.loanDetails.vehiclePrice?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                        <div><span className="text-gray-600">Dealer/Seller:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.dealerName}</p></div>
                        <div><span className="text-gray-600">Loan Amount:</span><p className="font-medium text-gray-800">₱{selectedTicket.loanDetails.loanAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                        <div><span className="text-gray-600">Repayment Term:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.repaymentTerm}</p></div>
                      </div>
                    ) : selectedTicket.type === 'Salary Loan' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                        <div><span className="text-gray-600">Loan Amount:</span><p className="font-medium text-gray-800">₱{selectedTicket.loanDetails.loanAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                        <div><span className="text-gray-600">Repayment Term:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.repaymentTerm}</p></div>
                        <div className="col-span-1 sm:col-span-2"><span className="text-gray-600">Loan Purpose:</span><p className="font-medium text-gray-800">{selectedTicket.loanDetails.loanPurpose}</p></div>
                      </div>
                    ) : null}
                  </div>
                )}

                {selectedTicket.type === 'Medical LOA' && selectedTicket.loaDetails && (
                  <div className="mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Medical LOA Details</h3>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="grid grid-cols-1 sm:grid-cols-2 px-3 md:px-4 py-2 md:py-3">
                        <span className="text-xs md:text-sm font-medium text-gray-500">Hospital:</span>
                        <span className="text-xs md:text-sm font-medium text-gray-900">{selectedTicket.loaDetails.hospitalName}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 px-3 md:px-4 py-2 md:py-3 bg-gray-50">
                        <span className="text-xs md:text-sm font-medium text-gray-500">Address:</span>
                        <span className="text-xs md:text-sm font-medium text-gray-900">{selectedTicket.loaDetails.hospitalAddress}, {selectedTicket.loaDetails.hospitalCity}, {selectedTicket.loaDetails.hospitalProvince}, {selectedTicket.loaDetails.hospitalRegion}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 px-3 md:px-4 py-2 md:py-3">
                        <span className="text-xs md:text-sm font-medium text-gray-500">Visit Date:</span>
                        <span className="text-xs md:text-sm font-medium text-gray-900">{selectedTicket.loaDetails.visitDate}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 px-3 md:px-4 py-2 md:py-3 bg-gray-50">
                        <span className="text-xs md:text-sm font-medium text-gray-500">Reason:</span>
                        <span className="text-xs md:text-sm font-medium text-gray-900">{selectedTicket.loaDetails.reasonType}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 px-3 md:px-4 py-2 md:py-3">
                        <span className="text-xs md:text-sm font-medium text-gray-500">Complaint:</span>
                        <span className="text-xs md:text-sm font-medium text-gray-900">{selectedTicket.loaDetails.patientComplaint}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 px-3 md:px-4 py-2 md:py-3 bg-gray-50">
                        <span className="text-xs md:text-sm font-medium text-gray-500">Preferred Doctor:</span>
                        <span className="text-xs md:text-sm font-medium text-gray-900">{selectedTicket.loaDetails.preferredDoctor}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTicket.type === 'Medical LOA' && selectedTicket.status === 'Approved' && selectedTicket.qrCode && (
                  <div className="mb-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">LOA Request Approved</h3>
                    <div className="bg-white rounded-lg p-4 md:p-6 text-center">
                      <p className="text-gray-700 mb-4 text-sm md:text-base">
                        Please present this QR code at our accredited hospitals and partner clinics.
                      </p>
                      <div className="mb-4 flex justify-center">
                        <img
                          src={selectedTicket.qrCode}
                          alt="LOA QR Code"
                          className="w-36 h-36 md:w-48 md:h-48 mx-auto"
                        />
                      </div>
                      <button
                        onClick={() => downloadQRCode(selectedTicket.qrCode, selectedTicket.tokenNumber)}
                        className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-sm md:text-base"
                      >
                        <Download size={18} />
                        Download QR Code
                      </button>
                    </div>
                  </div>
                )}

                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Attachments ({selectedTicket.attachments.length})</h3>
                    <div className="space-y-2">
                      {selectedTicket.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex justify-between items-center bg-white rounded p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <div>
                              <p
                                className="text-xs md:text-sm font-medium text-gray-800 cursor-pointer hover:text-blue-600"
                                onClick={() => handleViewFile(attachment.url, attachment.filename)}
                              >
                                {attachment.filename}
                              </p>
                              <p className="text-xs text-gray-500">{attachment.size}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleViewFile(attachment.url, attachment.filename)}
                            className="text-blue-600 hover:text-blue-700 text-xs md:text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Comments:</h3>
                  <p className="text-xs md:text-sm text-gray-600 mb-4">Post here comment of HR and higher roles</p>
                  {selectedTicket.comments && selectedTicket.comments.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {selectedTicket.comments.map((comment) => (
                        <div key={comment.id} className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div><p className="font-medium text-gray-800 text-sm md:text-base">{comment.author}</p><p className="text-xs text-gray-500">{comment.role}</p></div>
                            <p className="text-xs text-gray-500">{formatDateTime(comment.timestamp)}</p>
                          </div>
                          <p className="text-xs md:text-sm text-gray-700">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-3">
                    <textarea value={newComment} onChange={(e) => { setNewComment(e.target.value); setCommentError(''); }} placeholder="Add your comment here..." className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm md:text-base" rows={3} />
                    {commentError && <p className="text-red-600 text-xs md:text-sm">{commentError}</p>}
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">{newComment.length}/500 characters</p>
                      <button onClick={handleAddComment} className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium">Post Comment</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/3 p-4 sm:p-6 md:p-8 bg-gray-50 overflow-y-auto">
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Token Number</h3>
              <p className="text-xl md:text-2xl font-bold text-blue-600 mb-6">{selectedTicket.tokenNumber}</p>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3 text-sm md:text-base">Status</h4>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium ${selectedTicket.status === 'Rejected' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-400'}`}>Rejected</span>
                  <span className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium ${selectedTicket.status === 'Pending' ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-400'}`}>Pending</span>
                  <span className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium ${selectedTicket.status === 'Approved' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>Approved</span>
                </div>
              </div>

              {selectedTicket.viewedDate && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Request Viewed:</h4>
                  <p className="text-xs md:text-sm text-gray-600">{formatDateTime(selectedTicket.viewedDate)}</p>
                </div>
              )}

              {selectedTicket.approvalStampedDate && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Approval Stamped:</h4>
                  <p className="text-xs md:text-sm text-gray-600">{formatDateTime(selectedTicket.approvalStampedDate)}</p>
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3 text-sm md:text-base">Approval Hierarchy:</h4>
                <div className="space-y-3">
                  {(selectedTicket.type === 'Medical LOA' ?
                    selectedTicket.approvers.filter(approver => approver.level <= 1) :
                    selectedTicket.type === 'House Booking' ?
                      selectedTicket.approvers.filter(approver => approver.level <= 2) :
                      selectedTicket.approvers
                  ).map((approver, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="font-medium text-gray-800 text-sm md:text-base">{approver.name}</p>
                          <p className="text-xs md:text-sm text-gray-600">{approver.position}</p>
                        </div>
                        {approver.status && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(approver.status)}`}>{approver.status}</span>
                        )}
                      </div>
                      {approver.timestamp && <p className="text-xs text-gray-500 mt-2">{formatDateTime(approver.timestamp)}</p>}
                      {approver.comment && <p className="text-xs text-gray-600 mt-2 italic">&quot;{approver.comment}&quot;</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3 text-sm md:text-base">Ticket Details</h4>
                <div className="space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Type:</span><span className="font-medium text-gray-800">{selectedTicket.type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Submitted:</span><span className="font-medium text-gray-800">{formatDate(selectedTicket.submittedDate)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Last Updated:</span><span className="font-medium text-gray-800">{formatDate(selectedTicket.lastUpdated)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && selectedTicket && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h3 className="text-lg md:text-xl font-semibold text-gray-800">Cancel Booking</h3>
            </div>

            <form onSubmit={handleCancelBooking}>
              <div className="p-4 md:p-6">
                <div className="mb-4">
                  <p className="text-gray-700 mb-2 text-sm md:text-base">
                    Are you sure you want to cancel your booking for:
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="font-medium text-sm md:text-base">{selectedTicket.bookingDetails?.propertyName}</p>
                    <p className="text-xs md:text-sm text-gray-600">
                      Check-in: {selectedTicket.bookingDetails?.checkinDate ?
                        new Date(selectedTicket.bookingDetails.checkinDate).toLocaleDateString() : 'N/A'} at {selectedTicket.bookingDetails?.checkinTime || 'N/A'}
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">
                      Check-out: {selectedTicket.bookingDetails?.checkoutDate ?
                        new Date(selectedTicket.bookingDetails.checkoutDate).toLocaleDateString() : 'N/A'} at {selectedTicket.bookingDetails?.checkoutTime || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                    Reason for cancellation (optional)
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                    rows={3}
                    placeholder="Please provide a reason for cancelling..."
                  ></textarea>
                </div>

                {cancelError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs md:text-sm">
                    {cancelError}
                  </div>
                )}

                <p className="text-xs md:text-sm text-gray-600 italic">
                  Note: Once cancelled, this action cannot be undone.
                </p>
              </div>

              <div className="p-4 md:p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-3 md:px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none text-sm md:text-base"
                  disabled={isSubmittingCancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 md:px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm md:text-base"
                  disabled={isSubmittingCancel}
                >
                  {isSubmittingCancel ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingFile && (
        <div
          className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
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
                    <a
                      href={viewingFile}
                      download
                      className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Download File
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ScrollToTopButton />
    </div>
  );
}