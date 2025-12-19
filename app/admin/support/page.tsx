// app/admin/support/page.tsx

"use client"
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  EyeIcon,
  ArrowUpDown,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';

// Define ticket status type
type TicketStatus = 'Unread' | 'Read' | 'In Progress' | 'Resolved';

interface SupportTicket {
  id: number;
  employee_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  category: string;
  subject: string;
  description: string;
  attachment_path: string;
  status: TicketStatus;
  submitted_at: string;
  updated_at: string;
  resolution_comment?: string; // New field for resolution comment
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [categories, setCategories] = useState<string[]>([]);
  const [resolutionComment, setResolutionComment] = useState('');
  
  useEffect(() => {
    fetchTickets();
  }, []);
  
  useEffect(() => {
    filterAndSortTickets();
  }, [searchQuery, statusFilter, categoryFilter, sortBy, sortOrder, tickets]);
  
  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/support/tickets');
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(data.tickets?.map((ticket: SupportTicket) => ticket.category) || [])
        );
        setCategories(uniqueCategories as string[]);
      } else {
        console.error('Failed to fetch support tickets');
      }
    } catch (error) {
      console.error('Error fetching support tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortTickets = () => {
    let result = [...tickets];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(ticket => 
        ticket.subject.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        ticket.first_name.toLowerCase().includes(query) ||
        ticket.last_name.toLowerCase().includes(query) ||
        ticket.employee_id.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'All') {
      result = result.filter(ticket => ticket.status === statusFilter);
    }
    
    // Apply category filter
    if (categoryFilter !== 'All') {
      result = result.filter(ticket => ticket.category === categoryFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc' 
          ? new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          : new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      } else { // status
        const statusOrder: Record<string, number> = {
          'Unread': 0,
          'In Progress': 1,
          'Read': 2,
          'Resolved': 3
        };
        
        const orderA = statusOrder[a.status] || 0;
        const orderB = statusOrder[b.status] || 0;
        
        return sortOrder === 'desc' 
          ? orderA - orderB
          : orderB - orderA;
      }
    });
    
    setFilteredTickets(result);
  };
  
  const handleStatusChange = async (ticketId: number, status: TicketStatus, comment?: string) => {
    try {
      setUpdateStatus('idle');
      const response = await fetch('/api/admin/support/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticketId, 
          status, 
          resolutionComment: comment 
        }),
      });
      
      if (response.ok) {
        // Update tickets list
        setTickets(prev => 
          prev.map(ticket => 
            ticket.id === ticketId ? { 
              ...ticket, 
              status,
              resolution_comment: comment || ticket.resolution_comment
            } : ticket
          )
        );
        
        // If we're updating the selected ticket, update that too
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => prev ? { 
            ...prev, 
            status,
            resolution_comment: comment || prev.resolution_comment 
          } : null);
        }
        
        setUpdateStatus('success');
        setTimeout(() => setUpdateStatus('idle'), 2000);
        
        // Clear resolution comment after successful resolution
        if (status === 'Resolved') {
          setResolutionComment('');
        }
      } else {
        console.error('Failed to update ticket status');
        setUpdateStatus('error');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      setUpdateStatus('error');
    }
  };
  
  const viewTicketDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResolutionComment(ticket.resolution_comment || '');
    
    // If ticket is unread, mark it as read
    if (ticket.status === 'Unread') {
      handleStatusChange(ticket.id, 'Read');
    }
  };

  const closeTicketDetails = () => {
    setSelectedTicket(null);
    setResolutionComment('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Unread':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'Read':
        return <EyeIcon className="w-4 h-4 text-blue-500" />;
      case 'In Progress':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'Resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };
  
  const getStatusClassName = (status: string) => {
    switch(status) {
      case 'Unread':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Read':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const markAsResolved = () => {
    if (selectedTicket) {
      if (!resolutionComment.trim()) {
        alert('Please enter a resolution comment before resolving the ticket.');
        return;
      }
      
      handleStatusChange(selectedTicket.id, 'Resolved', resolutionComment.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700 flex items-center mr-4">
                <ChevronLeft className="w-5 h-5 mr-1" />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Support Tickets</h1>
            </div>
            
            <button
              type="button"
              onClick={fetchTickets}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="relative inline-block">
                  <select
                    className="appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Unread">Unread</option>
                    <option value="Read">Read</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <Filter className="h-4 w-4" />
                  </div>
                </div>

                <div className="relative inline-block">
                  <select
                    className="appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <Filter className="h-4 w-4" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSortBy('date');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className={`inline-flex items-center px-3 py-2 border ${
                    sortBy === 'date' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                  } rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50`}
                >
                  <ArrowUpDown className="w-4 h-4 mr-1" />
                  Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('status');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className={`inline-flex items-center px-3 py-2 border ${
                    sortBy === 'status' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                  } rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50`}
                >
                  <ArrowUpDown className="w-4 h-4 mr-1" />
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-gray-900">No tickets found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery || statusFilter !== 'All' || categoryFilter !== 'All'
                    ? 'Try adjusting your search or filters'
                    : 'There are no support tickets yet'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">#{ticket.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {ticket.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{ticket.first_name} {ticket.last_name}</div>
                        <div className="text-xs text-gray-500">{ticket.employee_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {ticket.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusClassName(ticket.status)}`}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(ticket.status)}
                            <span>{ticket.status}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(ticket.submitted_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => viewTicketDetails(ticket)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="font-semibold text-xl text-gray-800 truncate">
                {selectedTicket.subject}
              </h3>
              <button 
                type="button" 
                onClick={closeTicketDetails}
                className="text-gray-600 hover:text-red-600 p-1 rounded-full hover:bg-gray-100"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex-1">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Ticket Details</h4>
                    <p className="text-sm text-gray-500">Submitted {formatDate(selectedTicket.submitted_at)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Status:</span>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as TicketStatus)}
                      className="text-sm border border-gray-300 rounded-md p-1 bg-white"
                    >
                      <option value="Unread">Unread</option>
                      <option value="Read">Read</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                {updateStatus === 'success' && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-800">Status updated successfully</p>
                  </div>
                )}

                {updateStatus === 'error' && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-800">Failed to update status. Please try again.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Employee Information</h5>
                    <p className="text-sm">
                      <span className="font-medium">Name:</span> {selectedTicket.first_name} {selectedTicket.middle_name ? selectedTicket.middle_name + ' ' : ''}{selectedTicket.last_name}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Employee ID:</span> {selectedTicket.employee_id}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Email:</span> {selectedTicket.email}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Ticket Information</h5>
                    <p className="text-sm">
                      <span className="font-medium">Category:</span> {selectedTicket.category}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Ticket ID:</span> #{selectedTicket.id}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Last Updated:</span> {formatDate(selectedTicket.updated_at)}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Description</h5>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                </div>

                {selectedTicket.attachment_path && (
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Attachment</h5>
                    <a 
                      href={selectedTicket.attachment_path} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                        <img 
                          src={selectedTicket.attachment_path} 
                          alt="Ticket Attachment" 
                          className="max-h-64 mx-auto object-contain"
                        />
                      </div>
                      <div className="text-center mt-2">
                        <span className="text-sm text-blue-600 hover:underline flex items-center justify-center">
                          <EyeIcon className="w-4 h-4 mr-1" />
                          View Full Image
                        </span>
                      </div>
                    </a>
                  </div>
                )}

                {/* Resolution Comment */}
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Resolution Comment
                    {selectedTicket.status === 'Resolved' && (
                      <span className="ml-2 text-xs text-gray-500">(Already resolved)</span>
                    )}
                  </h5>
                  <textarea
                    value={resolutionComment}
                    onChange={(e) => setResolutionComment(e.target.value)}
                    disabled={selectedTicket.status === 'Resolved'}
                    placeholder="Enter details about how this issue was resolved..."
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                      selectedTicket.status === 'Resolved' ? 'bg-gray-50' : 'bg-white'
                    }`}
                    rows={4}
                  ></textarea>
                  {selectedTicket.status === 'Resolved' && selectedTicket.resolution_comment && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-800">Resolution provided</span>
                      </div>
                      <p className="text-sm text-green-800 whitespace-pre-wrap">{selectedTicket.resolution_comment}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
              <button
                type="button"
                onClick={closeTicketDetails}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={markAsResolved}
                disabled={selectedTicket.status === 'Resolved'}
                className={`px-4 py-2 ${
                  selectedTicket.status === 'Resolved'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white rounded-md text-sm font-medium`}
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}