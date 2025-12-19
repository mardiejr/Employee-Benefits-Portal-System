"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "../components/LogoutButton";
import useAuth from "../hooks/useAuth";
import EmployeeNavbar from "../components/EmployeeNavbar";
import useUserProfile from "../hooks/useUserProfile";
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

interface UserProfile {
  employee_id: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
}

interface BookedDate {
  checkin_date: string;
  checkout_date: string;
  checkin_time: string;
  checkout_time: string;
  booker_name?: string;
}

export default function StaffHouseBooking() {
  const { handleApiError } = useAuth();
  const { isApprover } = useUserProfile();
  const [selectedHouse, setSelectedHouse] = useState<any>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedDates, setBookedDates] = useState<BookedDate[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const router = useRouter();

  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    position: "",
    department: "",
    natureOfStay: "",
    reasonForUse: "",
    checkinTime: "08:00",
    checkoutTime: "17:00",
    numberOfGuests: "1",
    agreeToRules: false
  });

  const [errors, setErrors] = useState<any>({});

  const houses = [
    {
      id: 1,
      name: "Baguio Penthouse Unit A",
      location: "Baguio City",
      capacity: 4,
      description: "Luxury penthouse with mountain views and modern amenities",
      amenities: ["WiFi", "Kitchen", "Heating", "Parking"],
      image: "/images/baguio.png"
    },
    {
      id: 2,
      name: "Caloocoan Penthouse",
      location: "Caloocan City",
      capacity: 2,
      description: "Beachside penthouse room with ocean breeze and city access",
      amenities: ["WiFi", "AC", "Kitchen", "Sea View"],
      image: "/images/caloocan.jpg"
    },
    {
      id: 3,
      name: "Cebu Penthouse Unit B",
      location: "Cebu City",
      capacity: 3,
      description: "Spacious room perfect for small families with premium facilities",
      amenities: ["WiFi", "AC", "Balcony", "Parking"],
      image: "/images/cebu1.jpg"
    },
    {
      id: 4,
      name: "Makati Penthouse",
      location: "Makati City",
      capacity: 2,
      description: "Modern city penthouse with stunning urban views",
      amenities: ["WiFi", "AC", "Kitchen", "Gym Access"],
      image: "/images/makati.png"
    },
    {
      id: 5,
      name: "Laoag Penthouse Unit A",
      location: "Laoag City",
      capacity: 2,
      description: "Cozy penthouse room near historical sites and beaches",
      amenities: ["WiFi", "AC", "Kitchen", "Free Breakfast"],
      image: "/images/laoag_2.jpg"
    },
    {
      id: 6,
      name: "Laoag Penthouse",
      location: "Laoag City",
      capacity: 4,
      description: "Family-friendly unit with spacious living areas",
      amenities: ["WiFi", "Kitchen", "AC", "Parking"],
      image: "/images/laoag.jpg"
    },
    {
      id: 7,
      name: "Baguio Woodstown",
      location: "Baguio City",
      capacity: 3,
      description: "Charming woodland retreat with pine tree surroundings",
      amenities: ["WiFi", "Heating", "Fireplace", "Garden"],
      image: "/images/baguio_woodstown.jpg"
    },
    {
      id: 8,
      name: "CDO Penthouse",
      location: "Cagayan de Oro",
      capacity: 3,
      description: "Premium penthouse with river views and modern design",
      amenities: ["WiFi", "AC", "Balcony", "Kitchen"],
      image: "/images/cagayan.JPG"
    }
  ];

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');

        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        setUserProfile(data);

        // Auto-fill form fields
        setFormData(prev => ({
          ...prev,
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          position: data.position || '',
          department: data.department || ''
        }));

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  // Helper function to compare dates (date only, no time component)
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Helper function to check if a date is booked
  const isDateBooked = (date: Date): boolean => {
    for (const booking of bookedDates) {
      const checkinDate = new Date(booking.checkin_date);
      const checkoutDate = new Date(booking.checkout_date);
      
      // Create date-only versions for comparison
      const checkinDayOnly = new Date(checkinDate.getFullYear(), checkinDate.getMonth(), checkinDate.getDate());
      const checkoutDayOnly = new Date(checkoutDate.getFullYear(), checkoutDate.getMonth(), checkoutDate.getDate());
      const dateDayOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      if ((dateDayOnly >= checkinDayOnly && dateDayOnly <= checkoutDayOnly)) {
        return true;
      }
    }
    return false;
  };

  // Helper function to check if a date is in a cleaning period
  const isInCleaningPeriod = (date: Date): boolean => {
    for (const booking of bookedDates) {
      const checkoutDate = new Date(booking.checkout_date);
      const dateDayOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const checkoutDayOnly = new Date(checkoutDate.getFullYear(), checkoutDate.getMonth(), checkoutDate.getDate());
      
      if (isSameDay(dateDayOnly, checkoutDayOnly)) {
        // This date has a checkout - check if there's a cleaning period
        return true;
      }
    }
    return false;
  };

  // Combined function to check if a date is unavailable
  const isDateUnavailable = (date: Date): boolean => {
    return isDateBooked(date) || isInCleaningPeriod(date);
  };

  const fetchBookedDates = async (propertyName: string) => {
    setAvailabilityLoading(true);
    try {
      const response = await fetch(`/api/house-booking/availability?propertyName=${encodeURIComponent(propertyName)}`);
      if (response.ok) {
        const data = await response.json();
        setBookedDates(data.bookedDates || []);
      }
    } catch (error) {
      console.error('Error fetching booked dates:', error);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleCheckAvailability = (house: any) => {
    setSelectedHouse(house);
    fetchBookedDates(house.name);
    setShowAvailabilityModal(true);
    setSelectedCheckIn(null);
    setSelectedCheckOut(null);
    setSelectingCheckOut(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: undefined }));
    }
  };

  // Check if date range is valid (max 5 days)
  const isValidDateRange = (start: Date, end: Date): boolean => {
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const daysDiff = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 5;
  };

  // Format date for API calls
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date selection in calendar
  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create date-only version of the clicked date for comparison
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Don't allow past dates or unavailable dates
    if (dateDay < todayDay || isDateBooked(date)) {
      return;
    }

    // Create a new date object with only year, month, day components
    const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (!selectingCheckOut) {
      setSelectedCheckIn(selectedDate);
      setSelectedCheckOut(null);
      setSelectingCheckOut(true);
      console.log("Selected check-in:", selectedDate);
    } else {
      if (selectedDate <= selectedCheckIn!) {
        setSelectedCheckIn(selectedDate);
        setSelectedCheckOut(null);
        console.log("Reset check-in:", selectedDate);
      } else if (isValidDateRange(selectedCheckIn!, selectedDate)) {
        // Check if any date in range is unavailable
        let allAvailable = true;
        const tempDate = new Date(selectedCheckIn!.getFullYear(), selectedCheckIn!.getMonth(), selectedCheckIn!.getDate());
        
        while (tempDate <= selectedDate) {
          if (isDateBooked(tempDate)) {
            allAvailable = false;
            break;
          }
          tempDate.setDate(tempDate.getDate() + 1);
        }
        
        if (allAvailable) {
          setSelectedCheckOut(selectedDate);
          setSelectingCheckOut(false);
          console.log("Selected check-out:", selectedDate);
        } else {
          alert('Some dates in your selected range are already booked. Please select a different range.');
        }
      } else {
        alert('Maximum stay is 5 days.');
      }
    }
  };

  const proceedToBooking = () => {
    if (!selectedCheckIn || !selectedCheckOut) {
      alert('Please select both check-in and check-out dates.');
      return;
    }
    
    setShowAvailabilityModal(false);
    setShowBookingModal(true);
    
    // Reset form except auto-filled fields
    setFormData(prev => ({
      ...prev,
      natureOfStay: "",
      reasonForUse: "",
      checkinTime: "08:00", // Default time, user can change
      checkoutTime: "17:00", // Default time, user can change
      numberOfGuests: "1",
      agreeToRules: false
    }));
    setErrors({});
  };

  const generateCalendarDays = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const days = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const calendarDays = generateCalendarDays(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  // Updated validateForm function with better date/time validation
  const validateForm = (): boolean => {
    const newErrors: any = {};
    
    // Basic validations
    if (!formData.natureOfStay) newErrors.natureOfStay = 'Nature of stay is required';
    if (!formData.reasonForUse.trim()) newErrors.reasonForUse = 'Reason for use is required';
    if (!selectedCheckIn) newErrors.checkinDate = 'Check-in date is required';
    if (!selectedCheckOut) newErrors.checkoutDate = 'Check-out date is required';
    if (!formData.checkinTime) newErrors.checkinTime = 'Check-in time is required';
    if (!formData.checkoutTime) newErrors.checkoutTime = 'Check-out time is required';
    if (!formData.numberOfGuests || parseInt(formData.numberOfGuests) < 1) {
      newErrors.numberOfGuests = 'Number of guests must be at least 1';
    }
    if (!formData.agreeToRules) newErrors.agreeToRules = 'You must agree to the house rules';
    
    // Check if check-in date/time is in the future
    if (selectedCheckIn) {
      const now = new Date();
      
      // Compare only the date components first
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDate = new Date(selectedCheckIn.getFullYear(), selectedCheckIn.getMonth(), selectedCheckIn.getDate());
      
      // If the selected date is today, then compare with the time
      if (selectedDate.getTime() === today.getTime()) {
        // Only check time if the date is today
        const [hours, minutes] = formData.checkinTime.split(':').map(Number);
        if (hours < now.getHours() || (hours === now.getHours() && minutes <= now.getMinutes())) {
          newErrors.checkinTime = "Check-in time must be in the future";
        }
      }
    }
    
    // Check if check-in time is after cleaning period if on same day as another checkout
    if (selectedCheckIn && !newErrors.checkinTime) {
      const checkinDateStr = formatDateForAPI(selectedCheckIn);
      const matchingCheckout = bookedDates.find(b => b.checkout_date === checkinDateStr);
      
      if (matchingCheckout) {
        const [checkoutHours, checkoutMins] = matchingCheckout.checkout_time.split(':').map(Number);
        const cleaningEndHour = (checkoutHours + 3) % 24; // Add 3 hours, wrap around if needed
        
        const [checkinHours, checkinMins] = formData.checkinTime.split(':').map(Number);
        
        // Convert to minutes for easier comparison (handles day wrapping)
        const cleaningEndInMinutes = (cleaningEndHour * 60) + checkoutMins;
        const checkinTimeInMinutes = (checkinHours * 60) + checkinMins;
        
        if (checkinTimeInMinutes < cleaningEndInMinutes) {
          const formattedCleaningEnd = `${String(cleaningEndHour).padStart(2, '0')}:${String(checkoutMins).padStart(2, '0')}`;
          newErrors.checkinTime = `Check-in time must be after ${formattedCleaningEnd} due to cleaning period`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Updated handleSubmitBooking function with fixed date formatting
  const handleSubmitBooking = async () => {
    if (!validateForm() || !userProfile || !selectedCheckIn || !selectedCheckOut) {
      // Show specific errors if they exist
      if (errors.checkinTime) {
        alert(errors.checkinTime);
        return;
      }
      if (Object.keys(errors).length > 0) {
        alert('Please check all required fields and try again.');
        return;
      }
      return;
    }

    console.log("Submitting booking with dates:", formatDateForAPI(selectedCheckIn), formatDateForAPI(selectedCheckOut));
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/house-booking/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          position: formData.position,
          department: formData.department,
          propertyName: selectedHouse.name,
          propertyLocation: selectedHouse.location,
          natureOfStay: formData.natureOfStay,
          reasonForUse: formData.reasonForUse,
          checkinDate: formatDateForAPI(selectedCheckIn),
          checkinTime: formData.checkinTime,
          checkoutDate: formatDateForAPI(selectedCheckOut),
          checkoutTime: formData.checkoutTime,
          numberOfGuests: formData.numberOfGuests
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('House booking request submitted successfully!');
        setShowBookingModal(false);
        router.push('/status');
      } else {
        alert(result.error || 'Failed to submit booking');
      }
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <EmployeeNavbar isApprover={isApprover} />

      <div className="relative bg-gradient-to-r from-blue-500 to-orange-800 text-white py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Staff House Booking</h1>
          <p className="text-lg md:text-xl mb-6 md:mb-8">Book your perfect getaway at our premium properties</p>
          <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8 text-base md:text-lg">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>8 Properties</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>4 Locations</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>Premium Amenities</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 md:mb-8">Available Properties</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {houses.map((house) => (
            <div key={house.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="relative h-48 overflow-hidden">
                {house.image ? (
                  <img src={house.image} alt={house.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600" />
                )}
                <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-sm font-semibold text-blue-600">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {house.capacity}
                </div>
              </div>
              <div className="p-4 md:p-5">
                <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2 line-clamp-2">{house.name}</h3>
                <div className="flex items-center text-gray-600 mb-3">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm">{house.location}</span>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{house.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {house.amenities.slice(0, 3).map((amenity, idx) => (
                    <span key={idx} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">{amenity}</span>
                  ))}
                </div>
                <button
                  onClick={() => handleCheckAvailability(house)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 text-sm md:text-base"
                >
                  Check Availability
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Availability Calendar Modal */}
      {showAvailabilityModal && selectedHouse && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">{selectedHouse.name}</h2>
                  <p className="text-gray-600">{selectedHouse.location}</p>
                </div>
                <button onClick={() => setShowAvailabilityModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {availabilityLoading ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading availability...</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-bold text-sm text-gray-800 mb-2">Booking Instructions</h3>
                    <ul className="text-xs md:text-sm text-gray-700 space-y-1">
                      <li>• Maximum stay: 5 days</li>
                      <li>• There is a 3-hour cleaning period after each checkout</li>
                      <li>• Select your check-in date first, then check-out date</li>
                      <li>• Dates with existing bookings are marked in red</li>
                      <li>• Dates with cleaning periods are marked in yellow</li>
                    </ul>
                  </div>

                  {(selectedCheckIn || selectedCheckOut) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Check-in</p>
                          <p className="font-semibold text-gray-800">
                            {selectedCheckIn ? new Date(selectedCheckIn).toLocaleDateString() : 'Not selected'}
                          </p>
                        </div>
                        <div className="hidden md:block">→</div>
                        <div>
                          <p className="text-sm text-gray-600">Check-out</p>
                          <p className="font-semibold text-gray-800">
                            {selectedCheckOut ? new Date(selectedCheckOut).toLocaleDateString() : 'Not selected'}
                          </p>
                        </div>
                        {selectedCheckIn && selectedCheckOut && (
                          <div>
                            <p className="text-sm text-gray-600">Duration</p>
                            <p className="font-semibold text-gray-800">
                              {Math.round((selectedCheckOut.getTime() - selectedCheckIn.getTime()) / (1000 * 60 * 60 * 24))} days
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => {
                          const newMonth = new Date(currentMonth);
                          newMonth.setMonth(newMonth.getMonth() - 1);
                          setCurrentMonth(newMonth);
                        }}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-lg font-semibold">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h3>
                      <button
                        onClick={() => {
                          const newMonth = new Date(currentMonth);
                          newMonth.setMonth(newMonth.getMonth() + 1);
                          setCurrentMonth(newMonth);
                        }}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs md:text-sm font-semibold text-gray-600 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day, idx) => {
                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                        
                        // Create date-only versions for comparisons
                        const today = new Date();
                        const isToday = isSameDay(day, today);
                        
                        const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                        const isBooked = isDateBooked(day);
                        const isCleaningPeriod = isInCleaningPeriod(day);
                        
                        const isCheckIn = selectedCheckIn && isSameDay(day, selectedCheckIn);
                        const isCheckOut = selectedCheckOut && isSameDay(day, selectedCheckOut);
                        
                        const isInRange = selectedCheckIn && selectedCheckOut && 
                                         day > selectedCheckIn && day < selectedCheckOut;

                        return (
                          <button
                            key={idx}
                            onClick={() => handleDateClick(day)}
                            disabled={isPast || !isCurrentMonth}
                            className={`
                              aspect-square p-1 md:p-2 text-xs md:text-sm rounded transition-colors
                              ${!isCurrentMonth ? 'text-gray-300' : ''}
                              ${isPast ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                              ${isBooked && !isCheckIn && !isCheckOut ? 'bg-red-100 text-red-800' : ''}
                              ${isCleaningPeriod && !isBooked && !isCheckIn && !isCheckOut ? 'bg-yellow-100 text-yellow-800' : ''}
                              ${isCheckIn || isCheckOut ? 'bg-blue-600 text-white font-bold' : ''}
                              ${isInRange ? 'bg-blue-100 text-blue-800' : ''}
                              ${!isPast && !isCheckIn && !isCheckOut && !isInRange && isCurrentMonth ? 'hover:bg-blue-50' : ''}
                              ${isToday && !isCheckIn && !isCheckOut ? 'ring-2 ring-blue-400' : ''}
                            `}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100"></div>
                        <span>Past/Unavailable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100"></div>
                        <span>Booked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-100"></div>
                        <span>Cleaning Period</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-600"></div>
                        <span>Selected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-100"></div>
                        <span>In Range</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={proceedToBooking}
                      disabled={!selectedCheckIn || !selectedCheckOut}
                      className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Proceed to Booking
                    </button>
                    <button
                      onClick={() => setShowAvailabilityModal(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {showBookingModal && selectedHouse && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">{selectedHouse.name}</h2>
                  <p className="text-gray-600">{selectedHouse.location}</p>
                </div>
                <button onClick={() => setShowBookingModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Selected Dates Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-sm text-gray-800 mb-2">Selected Dates</h3>
                <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Check-in: </span>
                    <span className="font-semibold">{selectedCheckIn?.toLocaleDateString()}</span>
                  </div>
                  <div className="hidden md:block">→</div>
                  <div>
                    <span className="text-gray-600">Check-out: </span>
                    <span className="font-semibold">{selectedCheckOut?.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Auto-filled Fields (Read-only) */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={`${formData.firstName} ${formData.lastName}`}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rank/Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Work Unit</label>
                  <input
                    type="text"
                    value={formData.department}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Nature of Stay */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nature of Stay *</label>
                <select
                  name="natureOfStay"
                  value={formData.natureOfStay}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select nature of stay</option>
                  <option value="personal">Personal</option>
                  <option value="official">Official</option>
                </select>
                {errors.natureOfStay && <p className="text-red-500 text-xs mt-1">{errors.natureOfStay}</p>}
              </div>

              {/* Reason for Use */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Use *</label>
                <textarea
                  name="reasonForUse"
                  value={formData.reasonForUse}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Please provide reason for booking..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                {errors.reasonForUse && <p className="text-red-500 text-xs mt-1">{errors.reasonForUse}</p>}
              </div>

              {/* Check-in and Check-out Times */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Time *</label>
                  <input
                    type="time"
                    name="checkinTime"
                    value={formData.checkinTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.checkinTime && <p className="text-red-500 text-xs mt-1">{errors.checkinTime}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Time *</label>
                  <input
                    type="time"
                    name="checkoutTime"
                    value={formData.checkoutTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.checkoutTime && <p className="text-red-500 text-xs mt-1">{errors.checkoutTime}</p>}
                </div>
              </div>

              {/* Number of Guests */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Guests *</label>
                <select
                  name="numberOfGuests"
                  value={formData.numberOfGuests}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: selectedHouse.capacity }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
                {errors.numberOfGuests && <p className="text-red-500 text-xs mt-1">{errors.numberOfGuests}</p>}
              </div>

              {/* House Rules */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-sm text-gray-800 mb-2">House Rules</h3>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• Employee-users must be physically present throughout the stay</li>
                  <li>• Observe maximum number of guests allowed</li>
                  <li>• Exercise due care and proper use of facilities</li>
                  <li>• Observe proper conduct and decorum</li>
                  <li>• Pets are not allowed</li>
                </ul>
              </div>

              {/* Agreement Checkbox */}
              <div className="mb-6">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeToRules"
                    checked={formData.agreeToRules}
                    onChange={handleInputChange}
                    className="mt-1 w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    I agree to the house rules and take full responsibility for my stay *
                  </span>
                </label>
                {errors.agreeToRules && <p className="text-red-500 text-xs mt-1">{errors.agreeToRules}</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  onClick={handleSubmitBooking}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Booking'}
                </button>
                <button
                  onClick={() => setShowBookingModal(false)}
                  disabled={isSubmitting}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}