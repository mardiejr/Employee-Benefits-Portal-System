"use client";

import { useState, useEffect } from "react";
import { Home, Search, Edit, Trash2, Check, X, ChevronDown, ChevronUp, 
  Calendar, 
  Users,
  User,
  Clock,
  AlertCircle,
  Eye,
  FileText
} from "lucide-react";

// Types
type BookingStatus = "all" | "Pending" | "Approved" | "Rejected" | "Completed";
type NatureOfStay = "personal" | "official";

interface Booking {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  propertyName: string;
  propertyLocation: string;
  natureOfStay: NatureOfStay;
  reasonForUse: string;
  checkinDate: string;
  checkinTime: string;
  checkoutDate: string;
  checkoutTime: string;
  numberOfGuests: number;
  status: string;
  currentApprovalLevel: number;
  submittedAt: string;
  updatedAt: string;
}

// Utility components
const BookingDetailRow = ({ label, value }: { label: string, value: any }) => (
  <div className="grid grid-cols-2 py-2 border-b border-gray-100">
    <div className="text-gray-600 font-medium">{label}</div>
    <div className="text-gray-900">{value}</div>
  </div>
);

export default function StaffHouseBookingPage() {
  // States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<BookingStatus>("all");
  const [sortField, setSortField] = useState<keyof Booking>("submittedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Property list derived from bookings
  const [properties, setProperties] = useState<{ name: string; location: string; count: number }[]>([]);

  // Fetch bookings and apply filters
  useEffect(() => {
    fetchBookings();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [bookings, searchTerm, propertyFilter, statusFilter, sortField, sortDirection]);

  // Generate property list from bookings
  useEffect(() => {
    if (bookings.length > 0) {
      const propertyMap = new Map<string, { name: string; location: string; count: number }>();
      
      bookings.forEach(booking => {
        const key = booking.propertyName;
        if (propertyMap.has(key)) {
          const property = propertyMap.get(key)!;
          propertyMap.set(key, { ...property, count: property.count + 1 });
        } else {
          propertyMap.set(key, { 
            name: booking.propertyName, 
            location: booking.propertyLocation, 
            count: 1 
          });
        }
      });
      
      setProperties(Array.from(propertyMap.values()));
    }
  }, [bookings]);

  // Fetch bookings
  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/house-bookings');
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.bookings.map((booking: any) => ({
          id: booking.id,
          employeeId: booking.employee_id,
          employeeName: `${booking.first_name} ${booking.last_name}`,
          position: booking.position,
          department: booking.department,
          propertyName: booking.property_name,
          propertyLocation: booking.property_location,
          natureOfStay: booking.nature_of_stay,
          reasonForUse: booking.reason_for_use,
          checkinDate: booking.checkin_date,
          checkinTime: booking.checkin_time,
          checkoutDate: booking.checkout_date,
          checkoutTime: booking.checkout_time,
          numberOfGuests: booking.number_of_guests,
          status: booking.status,
          currentApprovalLevel: booking.current_approval_level,
          submittedAt: booking.submitted_at,
          updatedAt: booking.updated_at
        })));
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setErrorMessage("Failed to fetch booking data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters to bookings
  const applyFilters = () => {
    let filtered = [...bookings];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.employeeId.toLowerCase().includes(term) || 
        booking.employeeName.toLowerCase().includes(term) ||
        booking.position.toLowerCase().includes(term) ||
        booking.department.toLowerCase().includes(term) ||
        booking.propertyName.toLowerCase().includes(term)
      );
    }
    
    // Apply property filter
    if (propertyFilter !== "all") {
      filtered = filtered.filter(booking => booking.propertyName === propertyFilter);
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(booking => booking.status === statusFilter);
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
    
    setFilteredBookings(filtered);
  };

  // Clear success and error messages
  const clearMessages = () => {
    setSuccessMessage("");
    setErrorMessage("");
  };
  
  // Handle sort toggle
  const handleSort = (field: keyof Booking) => {
    setSortDirection(field === sortField ? (sortDirection === "asc" ? "desc" : "asc") : "asc");
    setSortField(field);
  };
  
  // Open view booking modal
  const handleView = (booking: Booking) => {
    setCurrentBooking(booking);
    setShowViewModal(true);
  };
  
  // Open edit booking modal
  const handleEdit = (booking: Booking) => {
    setCurrentBooking(booking);
    
    setFormData({
      status: booking.status,
      currentApprovalLevel: booking.currentApprovalLevel,
      propertyName: booking.propertyName,
      propertyLocation: booking.propertyLocation,
      natureOfStay: booking.natureOfStay,
      reasonForUse: booking.reasonForUse,
      checkinDate: booking.checkinDate.split('T')[0],
      checkinTime: booking.checkinTime,
      checkoutDate: booking.checkoutDate.split('T')[0],
      checkoutTime: booking.checkoutTime,
      numberOfGuests: booking.numberOfGuests,
    });
    
    setShowEditModal(true);
  };
  
  // Open delete booking modal
  const handleDelete = (booking: Booking) => {
    setCurrentBooking(booking);
    setShowDeleteModal(true);
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "numberOfGuests" ? parseInt(value) : value
    });
  };

  // Update booking
  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    if (!currentBooking) return;
    
    try {
      const response = await fetch(`/api/admin/house-bookings?id=${currentBooking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Booking updated successfully`);
        setShowEditModal(false);
        fetchBookings(); // Refresh the bookings list
      } else {
        setErrorMessage(data.error || "Failed to update booking");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      setErrorMessage("Error connecting to server");
    }
  };
  
  // Delete booking
  const handleDeleteBooking = async () => {
    clearMessages();
    
    if (!currentBooking) return;
    
    try {
      const response = await fetch(`/api/admin/house-bookings?id=${currentBooking.id}`, {
        method: "DELETE"
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Booking deleted successfully`);
        setShowDeleteModal(false);
        fetchBookings(); // Refresh the bookings list
      } else {
        setErrorMessage(data.error || "Failed to delete booking");
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      setErrorMessage("Error connecting to server");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };
  
  // Get current approval stage text
  const getApprovalStage = (level: number): string => {
    switch (level) {
      case 1: return "Awaiting HR Approval";
      case 2: return "Awaiting Supervisor/Division Manager Approval";
      case 3: return "Awaiting Vice President Approval";
      case 4: return "Awaiting President Approval";
      default: return "Pending Review";
    }
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            <Check className="h-3 w-3 inline mr-1" />
            Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            <X className="h-3 w-3 inline mr-1" />
            Rejected
          </span>
        );
      case "Completed":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            <Check className="h-3 w-3 inline mr-1" />
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 inline mr-1" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Staff House Booking Management</h2>
        <p className="text-gray-600">View, manage, and process staff house booking requests from employees</p>
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

      {/* Property summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        {properties.map((property, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-md bg-blue-500 flex items-center justify-center">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{property.name}</h3>
                  <p className="text-sm text-gray-500">{property.location}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Bookings</p>
                <p className="text-xl font-semibold">{property.count}</p>
              </div>
              <button 
                onClick={() => setPropertyFilter(property.name === propertyFilter ? "all" : property.name)}
                className={`px-3 py-1 text-xs rounded-full ${
                  propertyFilter === property.name 
                    ? "bg-blue-100 text-blue-800" 
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {propertyFilter === property.name ? "Clear Filter" : "Filter"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by employee name, ID, position..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
            >
              <option value="all">All Properties</option>
              {properties.map((property, index) => (
                <option key={index} value={property.name}>
                  {property.name}
                </option>
              ))}
            </select>
            
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus)}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-grow overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-grow">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("employeeId")} className="flex items-center gap-1 hover:text-blue-600">
                    Employee ID
                    {sortField === "employeeId" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("employeeName")} className="flex items-center gap-1 hover:text-blue-600">
                    Employee
                    {sortField === "employeeName" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("propertyName")} className="flex items-center gap-1 hover:text-blue-600">
                    Property
                    {sortField === "propertyName" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">Guests</th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("checkinDate")} className="flex items-center gap-1 hover:text-blue-600">
                    Check-In
                    {sortField === "checkinDate" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("checkoutDate")} className="flex items-center gap-1 hover:text-blue-600">
                    Check-Out
                    {sortField === "checkoutDate" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-blue-600">
                    Status
                    {sortField === "status" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading booking data...</td></tr>
              ) : filteredBookings.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No bookings found</td></tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{booking.employeeId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{booking.employeeName}</td>
                    <td className="px-4 py-3 text-sm">{booking.propertyName}</td>
                    <td className="px-4 py-3 text-sm">{booking.numberOfGuests}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(booking.checkinDate)}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(booking.checkoutDate)}</td>
                    <td className="px-4 py-3">{renderStatusBadge(booking.status)}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleView(booking)} className="p-1 rounded-full hover:bg-blue-100 text-blue-600" title="View Details">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleEdit(booking)} className="p-1 rounded-full hover:bg-green-100 text-green-600" title="Edit Booking">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(booking)} className="p-1 rounded-full hover:bg-red-100 text-red-600" title="Delete Booking">
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
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>
      </div>

      {/* View Booking Modal */}
      {showViewModal && currentBooking && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-blue-500 flex items-center justify-center">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Booking Details</h3>
              </div>
              <div>{renderStatusBadge(currentBooking.status)}</div>
            </div>
            
            <div className="p-6">
              {/* Employee Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-lg font-semibold mb-3">Employee Information</h4>
                  <div className="space-y-1">
                    <BookingDetailRow label="Employee ID" value={currentBooking.employeeId} />
                    <BookingDetailRow label="Name" value={currentBooking.employeeName} />
                    <BookingDetailRow label="Position" value={currentBooking.position} />
                    <BookingDetailRow label="Department" value={currentBooking.department} />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-3">Property Information</h4>
                  <div className="space-y-1">
                    <BookingDetailRow label="Property Name" value={currentBooking.propertyName} />
                    <BookingDetailRow label="Location" value={currentBooking.propertyLocation} />
                    <BookingDetailRow label="Nature of Stay" value={currentBooking.natureOfStay === 'official' ? 'Official Business' : 'Personal'} />
                    <BookingDetailRow label="Number of Guests" value={currentBooking.numberOfGuests} />
                  </div>
                </div>
              </div>
              
              {/* Booking Details */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">Booking Details</h4>
                <div className="space-y-1">
                  <BookingDetailRow 
                    label="Check-In" 
                    value={`${formatDate(currentBooking.checkinDate)} at ${currentBooking.checkinTime}`} 
                  />
                  <BookingDetailRow 
                    label="Check-Out" 
                    value={`${formatDate(currentBooking.checkoutDate)} at ${currentBooking.checkoutTime}`} 
                  />
                  <BookingDetailRow 
                    label="Status" 
                    value={
                      currentBooking.status === 'Pending' 
                        ? getApprovalStage(currentBooking.currentApprovalLevel) 
                        : currentBooking.status
                    } 
                  />
                  <BookingDetailRow label="Submitted On" value={formatDate(currentBooking.submittedAt)} />
                  <BookingDetailRow label="Last Updated" value={formatDate(currentBooking.updatedAt)} />
                </div>
              </div>
              
              {/* Reason for Use */}
              <div>
                <h4 className="text-lg font-semibold mb-3">Reason for Use</h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p>{currentBooking.reasonForUse}</p>
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
                  handleEdit(currentBooking);
                }}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Edit Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditModal && currentBooking && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">Edit Booking</h3>
            </div>
            
            <form onSubmit={handleUpdateBooking}>
              <div className="p-6">
                {/* Employee Info (non-editable) */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">Employee Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Employee ID</label>
                      <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        value={currentBooking.employeeId} disabled />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Name</label>
                      <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        value={currentBooking.employeeName} disabled />
                    </div>
                  </div>
                </div>

                {/* Property Details (editable) */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">Property Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Property Name</label>
                      <input
                        type="text"
                        name="propertyName"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.propertyName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Property Location</label>
                      <input
                        type="text"
                        name="propertyLocation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.propertyLocation}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Booking Details (editable) */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">Booking Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Check-In Date</label>
                      <input
                        type="date"
                        name="checkinDate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.checkinDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Check-In Time</label>
                      <input
                        type="time"
                        name="checkinTime"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.checkinTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Check-Out Date</label>
                      <input
                        type="date"
                        name="checkoutDate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.checkoutDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Check-Out Time</label>
                      <input
                        type="time"
                        name="checkoutTime"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.checkoutTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Number of Guests</label>
                      <input
                        type="number"
                        name="numberOfGuests"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.numberOfGuests}
                        onChange={handleInputChange}
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Nature of Stay</label>
                      <select
                        name="natureOfStay"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.natureOfStay}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="personal">Personal</option>
                        <option value="official">Official Business</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Status and Approval Level (editable for admin) */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">Status Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Status</label>
                      <select
                        name="status"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Approval Level</label>
                      <select
                        name="currentApprovalLevel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.currentApprovalLevel}
                        onChange={handleInputChange}
                        required
                      >
                        <option value={1}>Level 1 - HR</option>
                        <option value={2}>Level 2 - Supervisor/Division Manager</option>
                        <option value={3}>Level 3 - Vice President</option>
                        <option value={4}>Level 4 - President</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Reason for Use */}
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Reason for Use</label>
                  <textarea
                    name="reasonForUse"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.reasonForUse}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  Update Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentBooking && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">Confirm Deletion</h3>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle className="h-6 w-6" />
                <p className="font-medium">Are you sure you want to delete this booking?</p>
              </div>
              <p className="text-gray-600 mb-3">
                You are about to delete the following booking:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="mb-1"><span className="font-medium">Employee:</span> {currentBooking.employeeName} ({currentBooking.employeeId})</p>
                <p className="mb-1"><span className="font-medium">Property:</span> {currentBooking.propertyName}</p>
                <p className="mb-1"><span className="font-medium">Check-In:</span> {formatDate(currentBooking.checkinDate)}</p>
                <p><span className="font-medium">Check-Out:</span> {formatDate(currentBooking.checkoutDate)}</p>
              </div>
              <p className="text-gray-700 font-medium">This action cannot be undone.</p>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button type="button" onClick={handleDeleteBooking}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}