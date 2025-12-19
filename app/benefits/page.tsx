"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MagicBento, { BentoCardProps } from "../components/MagicBento/MagicBento"; 
import useAuth from "../hooks/useAuth";
import EmployeeNavbar from "../components/EmployeeNavbar"; 
import useUserProfile from "../hooks/useUserProfile";
import { toast, Toaster } from "react-hot-toast";

export default function BenefitsPage() {
  const { handleApiError } = useAuth();
  const { userProfile, isApprover, loading } = useUserProfile();
  const router = useRouter();
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  // Function to check if user has been employed for at least 3 years
  const isEligibleForLoans = () => {
    if (!userProfile?.hire_date) return false;
    
    const hireDate = new Date(userProfile.hire_date);
    const today = new Date();
    
    // Calculate the difference in years
    const yearDiff = today.getFullYear() - hireDate.getFullYear();
    
    // Adjust for month and day
    const monthDiff = today.getMonth() - hireDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hireDate.getDate())) {
      return yearDiff - 1 >= 3;
    }
    
    return yearDiff >= 3;
  };

  // Handle loan application click
  const handleLoanClick = () => {
    if (isEligibleForLoans()) {
      router.push('/loan');
    } else {
      toast.error("Sorry, you are not yet eligible for loan benefits since you have less than 3 years in the company.");
    }
  };

  // Create the benefits cards array with proper conditional rendering
  const createBenefitsCards = () => {
    const isLoanEligible = isEligibleForLoans();
    
    return [
      {
        color: "#ffffff",
        title: "",
        description: "Request for Medical Letter of acceptance for hospitalization.",
        label: "Medical LOA",
        icon: (
          <img 
            src="/icons/medicalloa.svg" 
            className="w-8 h-8 text-slate-700" 
            alt="Medical LOA Icon"
          />
        ),
        onClick: () => {
          router.push('/medloa');
        }
      },
      {
        color: "#ffffff",
        title: "",
        description: "easily submit and track your medical reimbursement claims.",
        label: "Medical Reimbursement",
        icon: (
          <img 
            src="/icons/medreim.svg" 
            className="w-8 h-8 text-slate-700" 
            alt="Medical Reimbursement Icon"
          />
        ),
        onClick: () => {
          router.push('/medreim');
        }
      },
      {
        color: "#ffffff",
        title: "",
        description: "Apply for various loan products tailored to your needs.",
        label: "Loan Application",
        icon: (
          <div className="relative">
            <img 
              src="/icons/loan.svg" 
              className="w-8 h-8 text-slate-700" 
              alt="Loan Application Icon"
            />
            {!isLoanEligible && (
              <div className="absolute -top-2 -right-2 bg-gray-100 rounded-full p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ),
        onClick: handleLoanClick
      },
    ];
  };

  // Initialize benefits cards
  const [benefitsCards, setBenefitsCards] = useState<BentoCardProps[]>([]);

  // Update benefits cards when userProfile loads and show page
  useEffect(() => {
    if (!loading) {
      setBenefitsCards(createBenefitsCards());
      
      setTimeout(() => {
        setPageLoaded(true);
      }, 500);
    }
  }, [userProfile, loading]);

  // If page is still loading, show simple loading overlay
  if (!pageLoaded) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-3"></div>
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  // Return the actual page once loading is complete
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Toaster position="top-right" />
      
      <EmployeeNavbar isApprover={isApprover} />

      {/* Hero Section (Full Background Image) */}
      <div
        className="flex-1 flex items-start justify-center px-4 sm:px-6 md:px-16 py-8 sm:py-12 md:py-30 bg-cover bg-center min-h-[400px] sm:min-h-[450px] md:min-h-[500px]"
        style={{ backgroundImage: "url('../placeholder/benepic.svg')" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-16 max-w-7xl w-full items-start">
          {/* Left Side - Text */}
          <div className="text-left mt-4 sm:mt-6 md:mt-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-500 mb-3 sm:mb-4 leading-snug">
              My Benefits
            </h1>
            <p className="text-xl sm:text-2xl md:text-4xl font-bold text-blue-900 mb-3 sm:mb-4 leading-snug">
              InLife Employee Benefits
            </p>

            <p className="text-gray-700 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 md:mb-10 leading-relaxed">
              The My Benefits Portal brings together everything you need in one place.
              From healthcare and financial support to loans, and company resources you can easily view, manage, and maximize your benefits with ease and confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button 
                onClick={() => {
                  window.scrollTo({
                    top: document.documentElement.scrollHeight,
                    behavior: 'smooth'
                  });
                }}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-900 text-white rounded-lg shadow-lg hover:bg-blue-800 transition duration-300 text-sm sm:text-base"
              >
                View Benefits
              </button>

              <Link href="/support">
                <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-slate-50 text-black rounded-lg shadow-lg hover:bg-blue-800 transition duration-300 text-sm sm:text-base">
                  Request Support
                </button>
              </Link>
            </div>
          </div>

          {/* Right Side - Optional */}
          <div className="hidden md:block">
            {/* Placeholder for image or decorative element */}
          </div>
        </div>
      </div>

      {/* Benefits Header */}
      <div className="px-4 sm:px-8 md:px-20 pt-8 sm:pt-12 md:pt-16">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-800 mb-2 sm:mb-3">Select your benefits</h2>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          Simplifying your access to employee benefits with Insular Life. Choose from a range of benefits designed to support your well-being and financial security.
        </p>
        {!isEligibleForLoans() && (
          <p className="text-xs sm:text-sm text-orange-600 mt-2">
            Note: Loan Applications are available only for employees with 3 or more years of service.
          </p>
        )}
      </div>

      {/* Magic Bento Section with Benefits Cards */}
      <div className="py-6 sm:py-8 md:py-10 flex justify-center px-4">
        <MagicBento 
          cards={benefitsCards}
          textAutoHide={true}
          enableStars={false}
          enableSpotlight={false}
          enableBorderGlow={true}
          enableTilt={false}
          enableMagnetism={false}
          clickEffect={false}
          spotlightRadius={300}
          particleCount={12}
          glowColor="132, 0, 255"
        />
      </div>

      {/* Eligibility Modal */}
      {showEligibilityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-bold text-red-600 mb-3 sm:mb-4">Not Eligible for Loans</h3>
            <p className="mb-4 text-sm sm:text-base">
              Sorry, you are not yet eligible for loan benefits since you have less than 3 years in the company.
            </p>
            <button
              onClick={() => setShowEligibilityModal(false)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-900 text-white rounded-lg text-sm sm:text-base"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}