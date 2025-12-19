"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MagicBento, { BentoCardProps } from "../components/MagicBento/MagicBento"; 
import LogoutButton from "../components/LogoutButton";
import useAuth from "../hooks/useAuth";
import EmployeeNavbar from "../components/EmployeeNavbar"; 
import useUserProfile from "../hooks/useUserProfile";
import { AlertTriangle, AlertCircle, Info } from "lucide-react"; 

interface LoanEligibility {
  salary: { eligible: boolean; reason: string | null };
  housing: { eligible: boolean; reason: string | null };
  car: { eligible: boolean; reason: string | null };
}

export default function LoanPage() {
  const { handleApiError } = useAuth();
  const { userProfile, isApprover, loading } = useUserProfile();
  const router = useRouter();
  const [eligibility, setEligibility] = useState<LoanEligibility>({
    salary: { eligible: true, reason: null },
    housing: { eligible: true, reason: null },
    car: { eligible: true, reason: null }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check loan eligibility when component mounts or userProfile changes
  useEffect(() => {
    if (userProfile) {
      checkAllLoanEligibility();
    }
  }, [userProfile]);
  
  // Check eligibility for all loan types
  const checkAllLoanEligibility = async () => {
    setIsLoading(true);
    try {
      // Fetch eligibility status for each loan type in parallel
      const [salaryRes, housingRes, carRes] = await Promise.all([
        fetch('/api/loan/check-eligibility?type=salary'),
        fetch('/api/loan/check-eligibility?type=housing'),
        fetch('/api/loan/check-eligibility?type=car')
      ]);
      
      const [salaryData, housingData, carData] = await Promise.all([
        salaryRes.json(),
        housingRes.json(),
        carRes.json()
      ]);
      
      setEligibility({
        salary: { 
          eligible: salaryData.eligible, 
          reason: salaryData.eligible ? null : salaryData.reason 
        },
        housing: { 
          eligible: housingData.eligible, 
          reason: housingData.eligible ? null : housingData.reason 
        },
        car: { 
          eligible: carData.eligible, 
          reason: carData.eligible ? null : carData.reason 
        }
      });
    } catch (error) {
      console.error("Error checking loan eligibility:", error);
      // Set all to eligible to avoid blocking users completely in case of API error
      setEligibility({
        salary: { eligible: true, reason: null },
        housing: { eligible: true, reason: null },
        car: { eligible: true, reason: null }
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle click on loan card when ineligible
  const handleIneligibleClick = (reason: string) => {
    alert(reason);
  };

  // Create loan cards based on eligibility
  const benefitsCards: BentoCardProps[] = [
    {
      color: eligibility.salary.eligible ? "#ffffff" : "#f5f5f5",
      title: "",
      description: "Request for Salary Loan.",
      label: "Salary Loan",
      icon: (
        <div className="relative">
          <img
            src="/icons/salaryloan.svg"
            className={`w-15 h-15 ${eligibility.salary.eligible ? 'text-slate-700' : 'text-slate-400'}`}
            alt="Salary Loan Icon"
          />
          {!eligibility.salary.eligible && (
            <div className="absolute -top-2 -right-2">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
          )}
        </div>
      ),
      onClick: () => {
        if (eligibility.salary.eligible) {
          router.push('/loan/salary-loan');
        } else if (eligibility.salary.reason) {
          handleIneligibleClick(eligibility.salary.reason);
        }
      }
    },
    {
      color: eligibility.car.eligible ? "#ffffff" : "#f5f5f5",
      title: "",
      description: "Request for Car Loan.",
      label: "Car Loan",
      icon: (
        <div className="relative">
          <img
            src="/icons/carloan.svg"
            className={`w-15 h-15 ${eligibility.car.eligible ? 'text-slate-700' : 'text-slate-400'}`}
            alt="Car Loan Icon"
          />
          {!eligibility.car.eligible && (
            <div className="absolute -top-2 -right-2">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
          )}
        </div>
      ),
      onClick: () => {
        if (eligibility.car.eligible) {
          router.push('/loan/car-loan');
        } else if (eligibility.car.reason) {
          handleIneligibleClick(eligibility.car.reason);
        }
      }
    },
    {
      color: eligibility.housing.eligible ? "#ffffff" : "#f5f5f5",
      title: "",
      description: "Request for Housing Loan.",
      label: "Housing Loan",
      icon: (
        <div className="relative">
          <img
            src="/icons/houseloan.svg"
            className={`w-15 h-15 ${eligibility.housing.eligible ? 'text-slate-700' : 'text-slate-400'}`}
            alt="Housing Loan Icon"
          />
          {!eligibility.housing.eligible && (
            <div className="absolute -top-2 -right-2">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
          )}
        </div>
      ),
      onClick: () => {
        if (eligibility.housing.eligible) {
          router.push('/loan/housing-loan');
        } else if (eligibility.housing.reason) {
          handleIneligibleClick(eligibility.housing.reason);
        }
      }
    },
  ];

  // Render loading state
  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <EmployeeNavbar isApprover={isApprover} />
        <div className="flex items-center justify-center h-[500px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-lg">Loading loan options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
     <EmployeeNavbar isApprover={isApprover} />
      {/* Hero Section (Full Background Image) */}
      <div
        className="flex-1 flex items-start justify-center px-6 md:px-16 py-30 bg-cover bg-center min-h-[500px]"
        style={{ backgroundImage: "url('../placeholder/loanpic.svg')" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 max-w-7xl w-full items-start">
          {/* Left Side - Text */}
          <div className="text-center md:text-left mt-8 md:mt-0">
            <h1 className="text-2xl md:text-3xl font-bold text-orange-500 mb-4 leading-snug">
            Loan Applications
            </h1>
            <p className="text-2xl md:text-4xl font-bold text-blue-900 mb-4 leading-snug">
              InLife Employee Benefits
            </p>

            <p className="text-gray-700 text-lg md:text-l mb-6">
              At our company, we value the financial well-being of our employees. Through our partnership with Insular Life, eligible employees can conveniently apply for personal or emergency loans with flexible terms and competitive rates. This benefit aims to provide financial support during important life events, unexpected expenses, or personal goals ensuring peace of mind and financial stability for every team member.
            </p>
          </div>

          {/* Right Side - Optional */}
          <div className="hidden md:block">
            {/* Placeholder for image or decorative element */}
          </div>
        </div>
      </div>

      {/* Loan Info Panel */}
      <div className="px-20 pt-16">
        <h2 className="text-4xl font-bold text-blue-800">Select your loan application</h2>
        <p className="text-l text-gray-600 mb-2">
          Conveniently access and manage your employee loan benefits with Insular Life. 
        </p>
        <p className="text-l text-gray-600">
          Empowering you to handle loan applications, monitor repayments, and stay financially secure all through a trusted and reliable platform.
        </p>

        {/* Loan Eligibility Notes */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-800">Loan Application Rules</h3>
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Class C employees can only apply for Salary Loans</li>
                <li>Housing Loans cannot be combined with Car or Salary Loans</li>
                <li>Car and Salary Loans can be combined, but you cannot have multiple loans of the same type</li>
                <li>All loans must be fully paid before applying for another loan of the same type</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Magic Bento Section with Benefits Cards */}
      <div className="py-20 justify-center">
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
    </div>
  );
}