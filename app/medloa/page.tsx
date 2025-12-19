"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import useAuth from "../hooks/useAuth";
import EmployeeNavbar from "../components/EmployeeNavbar";
import useUserProfile from "../hooks/useUserProfile";

interface Hospital {
  id: number;
  name: string;
  type: string;
  city: string;
  province: string;
  region: string;
  address: string;
  contactNumber: string;
  emailAddress: string;
  image?: string;
}

interface Doctor {
  id: number;
  doctor_name: string;
  specialty: string;
  hospital_id: number;
  hospital_name: string;
  category: string;
}

const mockHospitals: Hospital[] = [
  {
    id: 1,
    name: "St. Luke's Medical Center",
    type: "HOSPITAL",
    city: "QUEZON CITY",
    province: "METRO MANILA",
    region: "NCR",
    address: "279 E Rodriguez Sr. Ave, Quezon City",
    contactNumber: "02-8723-0101",
    emailAddress: "info@stlukes.com.ph",
    image: "/images/lukes.jpg"
  },
  {
    id: 2,
    name: "The Medical City",
    type: "HOSPITAL",
    city: "PASIG",
    province: "METRO MANILA",
    region: "NCR",
    address: "Ortigas Avenue, Pasig City",
    contactNumber: "02-8635-6789",
    emailAddress: "info@themedicalcity.com",
    image: "/images/medicalpasig.jpg"
  },
  {
    id: 3,
    name: "Unihealth Quezon City",
    type: "HOSPITAL",
    city: "QUEZON CITY",
    province: "METRO MANILA",
    region: "NCR",
    address: "83 FELIX MANALO ST. BRGY. IMMACULATE CONCEPCION",
    contactNumber: "02-8911-1234",
    emailAddress: "breinardha26@gmail.com",
    image: "/images/unihealthquezon.jpg"
  },
  {
    id: 4,
    name: "Manila General Hospital",
    type: "HOSPITAL",
    city: "MANILA",
    province: "METRO MANILA",
    region: "NCR",
    address: "1234 Taft Avenue, Manila",
    contactNumber: "02-8123-4567",
    emailAddress: "info@mgh.com.ph",
    image: "/images/manilageneral.jpg"
  },
  {
    id: 5,
    name: "Asian Hospital and Medical Center",
    type: "HOSPITAL",
    city: "Muntinlupa",
    province: "METRO MANILA",
    region: "NCR",
    address: "2208 Civic Drive, Alabang, Muntinlupa City",
    contactNumber: "02-8771-9000",
    emailAddress: "info@asianhospital.com",
    image: "/images/asianhospital.jpg"
  },
  {
    id: 6,
    name: "University of Perpetual Help",
    type: "HOSPITAL",
    city: "Binan",
    province: "Laguna",
    region: "CALABARZON",
    address: "University of Perpetual Help System Dalta, Binan City",
    contactNumber: "02-8671-8001",
    emailAddress: "info@rmc.gov.ph",
    image: "/images/perpbinan.jpg"
  }
];

export default function MedicalLOAPage() {
  const router = useRouter();
  const { handleApiError } = useAuth();
  const { userProfile, isApprover, loading } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [complaint, setComplaint] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [isConsented, setIsConsented] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [employeeData, setEmployeeData] = useState<{ firstName: string; lastName: string } | null>(null);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [fetchDoctorsError, setFetchDoctorsError] = useState("");

  useEffect(() => {
    // In a real application, this would be fetched from the backend
    if (userProfile) {
      setEmployeeData({
        firstName: userProfile.first_name || "",
        lastName: userProfile.last_name || ""
      });
    }
  }, [userProfile]);

  // Filter hospitals based on search query
  const filteredHospitals = mockHospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hospital.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hospital.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hospital.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle hospital selection
  const handleHospitalSelect = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setCurrentStep(2);
  };

  // Filter doctors based on selected hospital and reason
  const fetchDoctors = async (hospitalId: number, category: string) => {
    if (!hospitalId || !category) return;

    try {
      setIsLoadingDoctors(true);
      setFetchDoctorsError("");

      // Map UI category values to database values
      const categoryMap: Record<string, string> = {
        'consultation': 'Consultation',
        'laboratory': 'Laboratory Exam',
        'diagnostics': 'Diagnostics',
        'confinement': 'Confinement',
        'other': 'Other Procedures'
      };

      const dbCategory = categoryMap[category] || category;

      // Fetch doctors from the database
      const response = await fetch(`/api/doctors?hospitalId=${hospitalId}&category=${dbCategory}`);

      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setAvailableDoctors(data.data);

        // Reset selected doctor if not in the new list
        if (selectedDoctorId && !data.data.some((doctor: Doctor) => doctor.id === selectedDoctorId)) {
          setSelectedDoctorId(null);
          setDoctorName("");
        }
      } else {
        setAvailableDoctors([]);
        setSelectedDoctorId(null);
        setDoctorName("");
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setFetchDoctorsError("There was a problem loading doctors. Please try again.");
      setAvailableDoctors([]);
      setSelectedDoctorId(null);
      setDoctorName("");
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  useEffect(() => {
    if (selectedHospital && selectedReason) {
      fetchDoctors(selectedHospital.id, selectedReason);
    }
  }, [selectedHospital, selectedReason]);

  const handleDoctorSelect = (doctorId: number) => {
    setSelectedDoctorId(doctorId);
    const doctor = availableDoctors.find(d => d.id === doctorId);
    if (doctor) {
      setDoctorName(doctor.doctor_name);
    }
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isConsented) {
      setValidationError("You must agree to the data privacy consent to proceed");
      return;
    }

    if (!selectedHospital || !selectedDate || !selectedReason || !complaint) {
      setValidationError("Please complete all required fields");
      return;
    }

    // Add validation for doctor selection
    if (!doctorName.trim()) {
      setValidationError("Preferred doctor field is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setValidationError("");

      const reasonMap: Record<string, string> = {
        'consultation': 'Consultation',
        'laboratory': 'Laboratory Exam',
        'diagnostics': 'Diagnostics',
        'confinement': 'Confinement',
        'other': 'Other Procedures'
      };

      const dbReason = reasonMap[selectedReason] || selectedReason;

      const response = await fetch("/api/medical-loa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hospitalId: selectedHospital.id,
          hospitalName: selectedHospital.name,
          hospitalAddress: selectedHospital.address,
          hospitalCity: selectedHospital.city,
          hospitalProvince: selectedHospital.province,
          hospitalRegion: selectedHospital.region,
          visitDate: selectedDate,
          reasonType: dbReason,
          patientComplaint: complaint,
          preferredDoctor: doctorName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push("/status?type=Medical%20LOA");
      } else {
        setValidationError(data.error || "Failed to submit LOA request");
      }
    } catch (error) {
      console.error("Error submitting LOA request:", error);
      setValidationError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicator component
  const StepIndicator = () => {
    return (
      <div className="flex justify-center items-center mb-8">
        {[1, 2, 3, 4, 5].map((step, index) => (
          <div key={step} className="flex items-center">
            <button
              onClick={() => handleStepClick(step)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold transition-colors ${step === currentStep
                ? 'bg-green-500'
                : step < currentStep
                  ? 'bg-green-500'
                  : 'bg-gray-300 text-gray-700'
                }`}
              disabled={step > currentStep}
            >
              {step}
            </button>
            {index < 4 && (
              <div
                className={`h-1 w-12 ${currentStep > step ? 'bg-green-500' : 'bg-gray-300'}`}
              ></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Simple calendar component (for demo)
  const Calendar = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Add state to track the current month and year
    const [currentMonth, setCurrentMonth] = useState<number>(10); // November (0-based)
    const [currentYear, setCurrentYear] = useState<number>(2025);

    // Get current date info based on the state
    const currentDate = new Date(currentYear, currentMonth);
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    // Navigate to previous month
    const goToPreviousMonth = () => {
      setCurrentMonth(prevMonth => {
        if (prevMonth === 0) {
          setCurrentYear(prevYear => prevYear - 1);
          return 11;
        } else {
          return prevMonth - 1;
        }
      });
    };

    // Navigate to next month
    const goToNextMonth = () => {
      setCurrentMonth(prevMonth => {
        if (prevMonth === 11) {
          setCurrentYear(prevYear => prevYear + 1);
          return 0;
        } else {
          return prevMonth + 1;
        }
      });
    };

    // Create an array for the days of the month
    let calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(null); // Empty cells for days before the 1st of the month
    }

    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }

    const handleDateClick = (day: number) => {
      const month = (currentMonth + 1).toString().padStart(2, '0');
      const formattedDay = day.toString().padStart(2, '0');
      const selectedDate = `${currentYear}-${month}-${formattedDay}`;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateObj = new Date(selectedDate);
      selectedDateObj.setHours(0, 0, 0, 0);

      if (selectedDateObj <= today) {
        setValidationError("Please select a future date for your admission");
        return;
      }

      setValidationError("");
      setSelectedDate(selectedDate);
    };

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            <span className="sr-only">Previous month</span>
            ←
          </button>
          <h3 className="text-lg font-medium">{monthName} {currentYear}</h3>
          <button
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <span className="sr-only">Next month</span>
            →
          </button>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              {daysOfWeek.map(day => (
                <th key={day} className="py-2 px-3 text-center text-sm font-medium text-gray-500">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
              <tr key={`week-${weekIndex}`}>
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const day = calendarDays[weekIndex * 7 + dayIndex];
                  const month = (currentMonth + 1).toString().padStart(2, '0');
                  const isSelected = selectedDate === `${currentYear}-${month}-${day?.toString().padStart(2, '0')}`;
                  const isWeekend = dayIndex === 0 || dayIndex === 6;

                  return (
                    <td key={`day-${weekIndex}-${dayIndex}`} className="text-center py-1">
                      {day !== null ? (
                        <button
                          onClick={() => handleDateClick(day)}
                          disabled={new Date(currentYear, currentMonth, day) <= new Date(new Date().setHours(0, 0, 0, 0))}
                          className={`w-10 h-10 rounded-md mx-auto flex items-center justify-center
                            ${isSelected ? 'bg-teal-500 text-white' : ''}
                            ${isWeekend && !isSelected ? 'text-red-500' : ''}
                            ${new Date(currentYear, currentMonth, day) <= new Date(new Date().setHours(0, 0, 0, 0)) ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          {day}
                        </button>
                      ) : (
                        <div className="w-10 h-10"></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {selectedDate && (
          <p className="text-center mt-4 text-green-600 font-medium">
            You selected: {new Date(selectedDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        )}
      </div>
    );
  };

  // Service reason selector component
  const ServiceReasonSelector = () => {
    const reasons = [
      { id: 'consultation', label: 'Consultation', icon: '🩺' },
      { id: 'laboratory', label: 'Laboratory Exam', icon: '🧬' }, // Changed from 'laboratory'
      { id: 'diagnostics', label: 'Diagnostics', icon: '📊' },
      { id: 'confinement', label: 'Confinement', icon: '🛌️' },
      { id: 'other', label: 'Other Procedures', icon: '🔹' }, // Changed from 'other'
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {reasons.map((reason) => (
          <button
            key={reason.id}
            className={`lex flex-col items-center justify-center p-4 sm:p-6 rounded-lg border transition-all
          ${selectedReason === reason.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-200'}`}
            onClick={() => setSelectedReason(reason.id)}
          >
            <div className="text-3xl mb-2">{reason.icon}</div>
            <span className="text-sm font-medium">{reason.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // Render the appropriate step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Step 1 - Select Hospital (Preserving original design but removing distance/near you)
        return (
          <>
            <h1 className="text-xl sm:text-2xl font-bold text-orange-500 mb-2">Medical LOA</h1>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">
              iCare Accredited Health Partners in the Philippines
            </h2>

            <div className="flex flex-col md:flex-row items-start gap-6 md:gap-10 mb-6">
              <div className="flex-1">
                <p className="text-gray-600 leading-relaxed">
                  We are committed to providing our members with exceptional healthcare through a vast
                  network of iCare accredited health partners across the Philippines. With more than 2,000
                  hospitals and clinics nationwide and more than 35,000 accredited healthcare providers
                  offering quality medical services that are easily accessible, no matter where you are.
                  This extensive network allows members to choose their preferred healthcare provider,
                  giving them the flexibility to receive the care they need when they need it.
                </p>
              </div>
              <div className="w-full md:w-1/3">
                <img
                  src="/MedLoa.svg"
                  alt="Healthcare Worker"
                  className="rounded-lg shadow-sm"
                />
              </div>
            </div>

            {/* Step indicator - simplified version matching the screenshot */}
            <StepIndicator />

            <h3 className="text-lg font-semibold text-gray-800 mb-4">Accredited / Partner Hospitals and Clinics</h3>

            <p className="text-gray-600 mb-6">
              Feel free to reach out to our 24/7 Call Center at (02) 817-7857 or (02) 8813-9131, and simply dial 1 or email mse@insurarhealthcare.com.ph for any assistance you may need regarding our list of accredited providers.
            </p>

            <div className="mb-6">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Search className="h-5 w-5 text-gray-400" />
                </span>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search for a hospital or clinic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {filteredHospitals.map(hospital => (
                <div
                  key={hospital.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
                >
                  {/* Add hospital image */}
                  {hospital.image && (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={hospital.image}
                        alt={hospital.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="px-4 py-5 sm:p-6 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700">{hospital.name}</h3>
                      <p className="text-sm text-gray-500">{hospital.type}</p>
                      <p className="mt-2 text-sm text-gray-700">{hospital.address}, {hospital.city}, {hospital.province}</p>
                      <p className="mt-1 text-xs text-gray-500">{hospital.contactNumber}</p>
                    </div>

                    <button
                      onClick={() => handleHospitalSelect(hospital)}
                      className="mt-4 px-4 py-2 w-full bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      case 2: // Step 2 - Choose Date
        return (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Choose your preferred date</h2>
            <StepIndicator />

            {selectedHospital && employeeData && (
              <div className="text-center mb-6">
                <p className="text-gray-700">
                  LOA for <span className="font-bold text-blue-700">{employeeData.lastName}, {employeeData.firstName}</span>
                </p>
                <p className="text-gray-600 mt-2">
                  LOA requisition at{" "}
                  <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                    {selectedHospital.name}
                  </span>
                  {" : "}
                  <span className="text-blue-600 hover:underline cursor-pointer">
                    {selectedHospital.address}, {selectedHospital.city}, {selectedHospital.province}, {selectedHospital.region}, PHILIPPINES.
                  </span>
                </p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Date of Visit</h3>
              <Calendar />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="w-full sm:w-auto px-6 sm:px-10 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to previous step
              </button>
              <button
                onClick={() => {
                  if (!selectedDate) {
                    setValidationError("Please select a date before proceeding");
                    return;
                  }
                  setValidationError("");
                  setCurrentStep(3);
                }}
                className="w-full sm:w-auto px-6 sm:px-10 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Continue to next step
              </button>
            </div>

            {validationError && (
              <p className="mt-4 text-red-500 text-center">{validationError}</p>
            )}
          </>
        );

      case 3: // Step 3 - Choose Service Reason
        return (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Choose a Reason</h2>
            <StepIndicator />

            {selectedHospital && employeeData && (
              <div className="text-center mb-6">
                <p className="text-gray-700">
                  LOA for <span className="font-bold text-blue-700">{employeeData.lastName}, {employeeData.firstName}</span>
                </p>
                <p className="text-gray-600 mt-2">
                  LOA requisition at{" "}
                  <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                    {selectedHospital.name}
                  </span>
                  {" : "}
                  <span className="text-blue-600 hover:underline cursor-pointer">
                    {selectedHospital.address}, {selectedHospital.city}, {selectedHospital.province}, {selectedHospital.region}, PHILIPPINES.
                  </span>
                </p>
                {selectedDate && (
                  <p className="text-blue-600 mt-1">
                    Scheduled on {new Date(selectedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
            )}

            <ServiceReasonSelector />

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-10 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to previous step
              </button>
              <button
                onClick={() => {
                  if (!selectedReason) {
                    setValidationError("Please select a reason before proceeding");
                    return;
                  }
                  setValidationError("");
                  setCurrentStep(4);
                }}
                className="w-full sm:w-auto px-6 sm:px-10 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Continue to next step
              </button>
            </div>

            {validationError && (
              <p className="mt-4 text-red-500 text-center">{validationError}</p>
            )}
          </>
        );

      case 4: // Step 4 - Chief Complaint
        return (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">What are you feeling</h2>
            <StepIndicator />

            {selectedHospital && employeeData && (
              <div className="text-center mb-6">
                <p className="text-gray-700">
                  LOA for <span className="font-bold text-blue-700">{employeeData.lastName}, {employeeData.firstName}</span>
                </p>
                <p className="text-gray-600 mt-2">
                  LOA requisition at{" "}
                  <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                    {selectedHospital.name}
                  </span>
                  {" : "}
                  <span className="text-blue-600 hover:underline cursor-pointer">
                    {selectedHospital.address}, {selectedHospital.city}, {selectedHospital.province}, {selectedHospital.region}, PHILIPPINES.
                  </span>
                </p>
                {selectedDate && selectedReason && (
                  <p className="text-blue-600 mt-1">
                    Scheduled on {new Date(selectedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} | {selectedReason.charAt(0).toUpperCase() + selectedReason.slice(1)}
                  </p>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Please describe your complaint or symptoms</h3>
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={6}
                placeholder="Please provide details of your symptoms or medical concerns..."
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep(3)}
                className="w-full sm:w-auto px-6 sm:px-10 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to previous step
              </button>
              <button
                onClick={() => {
                  if (!complaint) {
                    setValidationError("Please describe your complaint or symptoms before proceeding");
                    return;
                  }
                  setValidationError("");
                  setCurrentStep(5);
                }}
                className="w-full sm:w-auto px-6 sm:px-10 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Continue to next step
              </button>
            </div>

            {validationError && (
              <p className="mt-4 text-red-500 text-center">{validationError}</p>
            )}
          </>
        );

      case 5: // Step 5 - Doctor and Consent
        return (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Final Details</h2>
            <StepIndicator />

            {selectedHospital && employeeData && (
              <div className="text-center mb-6">
                <p className="text-gray-700">
                  LOA for <span className="font-bold text-blue-700">{employeeData.lastName}, {employeeData.firstName}</span>
                </p>
                <p className="text-gray-600 mt-2">
                  LOA requisition at{" "}
                  <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                    {selectedHospital.name}
                  </span>
                  {" : "}
                  <span className="text-blue-600 hover:underline cursor-pointer">
                    {selectedHospital.address}, {selectedHospital.city}, {selectedHospital.province}, {selectedHospital.region}, PHILIPPINES.
                  </span>
                </p>
                {selectedDate && selectedReason && (
                  <p className="text-blue-600 mt-1">
                    Scheduled on {new Date(selectedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} | {selectedReason.charAt(0).toUpperCase() + selectedReason.slice(1)}
                  </p>
                )}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Select a Doctor <span className="text-red-500">*</span></label>

              {isLoadingDoctors ? (
                <div className="text-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading available doctors...</p>
                </div>
              ) : (
                <>
                  {fetchDoctorsError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md mb-4">
                      {fetchDoctorsError}
                      <button
                        className="ml-2 text-blue-600 hover:text-blue-800 underline"
                        onClick={() => fetchDoctors(selectedHospital?.id || 0, selectedReason)}
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedDoctorId || ""}
                    onChange={(e) => handleDoctorSelect(Number(e.target.value))}
                    required
                  >
                    <option value="">-- Select a doctor --</option>
                    {availableDoctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.doctor_name} - {doctor.specialty}
                      </option>
                    ))}
                  </select>

                  {availableDoctors.length === 0 && !fetchDoctorsError && (
                    <p className="mt-2 text-sm text-yellow-600">
                      No doctors available for this hospital and service. Please select a different hospital or service.
                    </p>
                  )}

                  {selectedDoctorId && (
                    <div className="mt-3 p-3 bg-green-50 rounded-md">
                      <p className="font-medium text-green-800">
                        Selected: {availableDoctors.find(d => d.id === selectedDoctorId)?.doctor_name}
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Specialization: {availableDoctors.find(d => d.id === selectedDoctorId)?.specialty}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mb-8">
              <h3 className="font-medium mb-2">Data Privacy Consent</h3>
              <p className="text-sm text-gray-600 mb-3">
                In compliance with the Data Privacy Act of 2012, The Medical City ensures that the information you provide will be kept
                strictly confidential and will only be processed, disclosed or shared upon your consent, or by law.
              </p>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  checked={isConsented}
                  onChange={(e) => setIsConsented(e.target.checked)}
                  required
                />
                <span className="text-sm text-gray-700">I consent to the collection and processing of my personal information for medical and insurance purposes.</span>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-10 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to previous step
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedDoctorId || !isConsented}
                className={`px-10 py-2 bg-blue-500 text-white rounded-lg transition-colors ${isSubmitting || !selectedDoctorId || !isConsented ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-600"
                  }`}
              >
                {isSubmitting ? "Submitting..." : "Submit LOA Request"}
              </button>
            </div>

            {validationError && (
              <p className="mt-4 text-red-500 text-center">{validationError}</p>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeNavbar />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 pb-20">
        {renderStepContent()}
      </div>
    </div>
  );
}