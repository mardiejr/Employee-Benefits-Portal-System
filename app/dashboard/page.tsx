"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import SpotlightCard from "../components/SpotlightCard/SpotlightCard"; 
import { toast, Toaster } from "react-hot-toast";
import EmployeeNavbar from "../components/EmployeeNavbar";
import useUserProfile from "../hooks/useUserProfile";
import useAuth from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import React from "react";

export default function Dashboard() {
  const images = [
    "/placeholder/slide1.jpg",
    "/placeholder/slide2.jpg",
    "/placeholder/slide3.jpg",
  ];
  
  const { handleApiError } = useAuth();
  const { userProfile, isApprover, loading } = useUserProfile();
  const router = useRouter();
  
  const [current, setCurrent] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  // Function to check if user has been employed for at least 3 years
  const isEligibleForLoans = () => {
    if (!userProfile?.hire_date) return false;
    
    const hireDate = new Date(userProfile.hire_date);
    const today = new Date();
    
    // Calculate the difference in years
    const yearDiff = today.getFullYear() - hireDate.getFullYear();
    
    // Adjust for month and days
    const monthDiff = today.getMonth() - hireDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hireDate.getDate())) {
      return yearDiff - 1 >= 3;
    }
    
    return yearDiff >= 3;
  };

  // Handle loan application click with proper event typing
  const handleLoanClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isEligibleForLoans()) {
      e.preventDefault();
      // Show eligibility notification
      toast.error("Sorry, you are not yet eligible for loan benefits since you have less than 3 years in the company.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Toast notifications */}
      <Toaster position="top-right" />
      
      {/* Use the shared EmployeeNavbar component instead of custom navbar */}
      <EmployeeNavbar isApprover={isApprover} />
      
      {/* Slideshow - Responsive height */}
      <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden">
        {images.map((img, index) => (
          <div 
            key={index}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
            style={{
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Content can be overlaid on the image here */}
          </div>
        ))}

        {/* Indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {images.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === current ? "bg-blue-600" : "bg-gray-300"
              }`}
            ></div>
          ))}
        </div>
      </div>

      {/* Quick Access Header - Responsive padding and text */}
      <div className="px-4 md:px-12 lg:px-20 pt-8 md:pt-12 lg:pt-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-800">Quick Access</h2>
        <p className="text-base md:text-lg lg:text-xl text-gray-600">
          Easily manage your insurance services.
        </p>
      </div>

      {/* Content Section with SpotlightCard - Responsive grid and padding */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-4 md:px-8 lg:px-12 py-8 md:py-12">
        <SpotlightCard className="bg-white shadow-md">
          <div className="flex flex-col items-center text-center p-4">
            <img
              src="/placeholder/card1.svg"
              alt="Coverage"
              className="h-32 md:h-40 lg:h-50 w-auto max-w-full object-contain mb-4"
            />
            <h3 className="text-slate-950 font-semibold mb-2 text-lg md:text-xl">Coverage</h3>
            <p className="text-gray-600 mb-4 text-sm md:text-base">
              View your complete benefits coverage, including healthcare,
              insurance, and eligibility details, all in one place.
            </p>
            <Link href="/benefits">
              <button className="bg-blue-800 text-white px-4 md:px-6 py-2 rounded hover:bg-blue-900 text-sm md:text-base">
                Go see our coverage
              </button>
            </Link>
          </div>
        </SpotlightCard>

        <SpotlightCard className="bg-white shadow-md">
          <div className="flex flex-col items-center text-center p-4">
            <img
              src="/placeholder/card2.svg"
              alt="Medical Requests"
              className="h-32 md:h-40 lg:h-50 w-auto max-w-full object-contain mb-4"
            />
            <h3 className="text-slate-950 font-semibold mb-2 text-lg md:text-xl">
              Status
            </h3>
            <p className="text-gray-600 mb-4 text-sm md:text-base">
              Easily track your medical, loan and staffhouse requests with clear updates on your benefits status
            </p>
            <Link href="/status">
              <button className="bg-blue-800 text-white px-4 md:px-6 py-2 rounded hover:bg-blue-900 text-sm md:text-base">
                Go see our Status Page
              </button>
            </Link>
          </div>
        </SpotlightCard>

        <SpotlightCard className="bg-white shadow-md h-full md:col-span-2 lg:col-span-1">
          <div className="flex flex-col items-center text-center h-full p-4">
            <img
              src="/placeholder/card3.svg"
              alt="Loan Applications"
              className="h-32 md:h-40 lg:h-50 w-auto max-w-full object-contain mb-4"
            />
            <h3 className="text-slate-950 font-semibold mb-2 text-lg md:text-xl">
              Loan Applications
            </h3>
            <p className="text-gray-600 mb-4 flex-grow text-sm md:text-base">
              Apply for loans securely, track your application status, and
              review available financing options anytime.
              {!loading && !isEligibleForLoans() && (
                <span className="block text-orange-600 text-sm mt-2">
                  (Available after 3 years of service)
                </span>
              )}
            </p>
            <div className="mt-auto relative w-full flex justify-center">
              {!loading && !isEligibleForLoans() ? (
                <button 
                  onClick={() => toast.error("Sorry, you are not yet eligible for loan benefits since you have less than 3 years in the company.")}
                  className="bg-gray-400 text-white px-4 md:px-6 py-2 rounded relative group text-sm md:text-base"
                >
                  <div className="flex items-center">
                    <span>Loan Application</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 ml-2 text-white" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Requires 3 years of service
                  </span>
                </button>
              ) : (
                <Link href="/loan">
                  <button className="bg-blue-800 text-white px-4 md:px-6 py-2 rounded hover:bg-blue-900 text-sm md:text-base">
                    Go see our Loan Application
                  </button>
                </Link>
              )}
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}