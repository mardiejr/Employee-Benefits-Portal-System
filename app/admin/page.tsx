// app/admin/page.tsx

"use client";
import { useState, useEffect, useRef } from "react";
import {
  Activity,
  Users,
  FileText,
  DollarSign,
  Home,
  Shield,
  Database,
  Search,
  Mail,
  User,
  Bell,
  ChevronDown,
  LogOut,
  TrendingUp,
  Menu,
  X
} from "lucide-react";
import ManageEmployeePage from "./manage-employee/page";
import LogTrailPage from "./logtrail/page";
import BackupPage from "./database-backup/page";
import LoanManagementPage from "./loan-management/page";
import StaffHouseBookingPage from "./staff-house-booking/page";
import BenefitsManagementPage from "./benefits-management/page";
import SupportTicketsPage from "./support/page";
import LogoutButton from "../components/LogoutButton";
import useAuth from "../hooks/useAuth";


export default function AdminDashboard() {
  const { handleApiError } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [notificationOpen, setNotificationOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingRequests: 0,
    activeLoans: 0,
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [adminName, setAdminName] = useState("Churaragi");

  // Refs for dropdown menus
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();

    // Get admin name from session storage if available
    const employeeData = sessionStorage.getItem("employee");
    if (employeeData) {
      try {
        const employee = JSON.parse(employeeData);
        if (employee.firstName) {
          setAdminName(employee.firstName);
        }
      } catch (e) {
        console.error("Error parsing employee data from session storage", e);
      }
    }
  }, []);

  // Handle clicks outside of dropdown menus
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format currency function
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard-stats');
      const data = await response.json();

      if (data.success) {
        setStats({
          totalEmployees: data.stats.totalEmployees,
          activeEmployees: data.stats.activeEmployees,
          pendingRequests: data.stats.pendingRequests,
          activeLoans: parseFloat(data.stats.activeLoansTotal),
        });
        setRecentRequests(data.recentRequests || []);
      }

      setNotifications([]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("employee");
    window.location.href = "/";
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  // Render the dashboard content
  const renderDashboard = () => {
    return (
      <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Total Employees */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="bg-blue-500 p-2 sm:p-3 rounded-lg">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-gray-400 text-xs sm:text-sm font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                +0
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-3 sm:mt-4">{stats.totalEmployees}</h3>
            <p className="text-gray-600 text-xs sm:text-sm">Total Employees</p>
          </div>

          {/* Active Employees */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="bg-green-500 p-2 sm:p-3 rounded-lg">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-gray-400 text-xs sm:text-sm font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                +0
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-3 sm:mt-4">{stats.activeEmployees}</h3>
            <p className="text-gray-600 text-xs sm:text-sm">Active Employees</p>
          </div>

          {/* Pending Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="bg-orange-500 p-2 sm:p-3 rounded-lg">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-gray-400 text-xs sm:text-sm font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                0
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-3 sm:mt-4">{stats.pendingRequests}</h3>
            <p className="text-gray-600 text-xs sm:text-sm">Pending Requests</p>
          </div>

          {/* Active Loans */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="bg-purple-500 p-2 sm:p-3 rounded-lg">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-gray-400 text-xs sm:text-sm font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                +0
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-3 sm:mt-4">{formatCurrency(stats.activeLoans)}</h3>
            <p className="text-gray-600 text-xs sm:text-sm">Active Loans</p>
          </div>
        </div>

        {/* Recent Benefit Requests - Table Layout */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Recent Benefit Requests</h2>

          {recentRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left pb-2 sm:pb-3 font-medium text-gray-600 text-xs sm:text-sm">Type</th>
                    <th className="text-left pb-2 sm:pb-3 font-medium text-gray-600 text-xs sm:text-sm">Employee</th>
                    <th className="text-left pb-2 sm:pb-3 font-medium text-gray-600 text-xs sm:text-sm">Status</th>
                    <th className="text-left pb-2 sm:pb-3 font-medium text-gray-600 text-xs sm:text-sm">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((request, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-2 sm:py-3 text-xs sm:text-sm">{request.type}</td>
                      <td className="py-2 sm:py-3 text-xs sm:text-sm">{request.employee}</td>
                      <td className="py-2 sm:py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                            request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 text-xs sm:text-sm">
                        {new Date(request.submitted_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4 text-sm">No recent requests</p>
          )}
        </div>
      </>
    );
  };

  // Render different pages based on currentPage states
  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return renderDashboard();
      case "manage-employee":
        return <ManageEmployeePage />;
      case "loan-management":
        return <LoanManagementPage />;
      case "staff-house-booking":
        return <StaffHouseBookingPage />;
      case "benefits-management":
        return <BenefitsManagementPage />;
      case "logtrail":
        return <LogTrailPage />;
      case "backup":
        return <BackupPage />;
      case "support": 
        return <SupportTicketsPage />;
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
            
            <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              A
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">Admin Dashboard</h1>
          </div>

          {/* Right-side Actions */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Regular Notification Bells */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-10 overflow-hidden">
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-sm sm:text-base">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((notification, index) => (
                        <div key={index} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                          <p className="text-sm mb-1">{notification.message}</p>
                          <p className="text-xs text-gray-500">{notification.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <User size={18} className="sm:w-5 sm:h-5" />
                </div>
                <span className="font-medium hidden md:block text-sm sm:text-base">Admin</span>
                <ChevronDown size={16} className="text-gray-500 hidden md:block sm:w-[18px] sm:h-[18px]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-10 overflow-hidden">
                  <div className="p-3 border-b border-gray-200">
                    <p className="font-semibold text-sm sm:text-base">Churaragi Kuyomi</p>
                    <p className="text-xs sm:text-sm text-gray-500">System Administrator</p>
                  </div>
                  <div>
                    <LogoutButton className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 text-red-600 text-sm sm:text-base">
                      <LogOut size={18} />
                      <span>Logout</span>
                    </LogoutButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/30 bg-opacity-50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar Navigation */}
        <aside className={`
          fixed md:sticky top-16 left-0 z-30
          w-64 border-r border-gray-200 bg-white 
          h-[calc(100vh-64px)] 
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}>
          <nav className="p-2 sm:p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handlePageChange("dashboard")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base ${currentPage === "dashboard"
                      ? "text-white bg-gradient-to-r from-orange-500 to-blue-500"
                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <Activity className="h-5 w-5" />
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePageChange("manage-employee")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base ${currentPage === "manage-employee"
                      ? "text-white bg-gradient-to-r from-orange-500 to-blue-500"
                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <Users className="h-5 w-5" />
                  Manage Employee
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePageChange("benefits-management")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base ${currentPage === "benefits-management"
                      ? "text-white bg-gradient-to-r from-orange-500 to-blue-500"
                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <FileText className="h-5 w-5" />
                  Benefits Management
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePageChange("loan-management")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base ${currentPage === "loan-management"
                      ? "text-white bg-gradient-to-r from-orange-500 to-blue-500"
                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <DollarSign className="h-5 w-5" />
                  Loan Management
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePageChange("staff-house-booking")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base ${currentPage === "staff-house-booking"
                      ? "text-white bg-gradient-to-r from-orange-500 to-blue-500"
                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <Home className="h-5 w-5" />
                  Staff House Booking
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePageChange("logtrail")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base ${currentPage === "logtrail"
                      ? "text-white bg-gradient-to-r from-orange-500 to-blue-500"
                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <Shield className="h-5 w-5" />
                  Log Trail
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePageChange("backup")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base ${currentPage === "backup"
                      ? "text-white bg-gradient-to-r from-orange-500 to-blue-500"
                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <Database className="h-5 w-5" />
                  Database Backup
                </button>
              </li>
              {/* Added Support Tickets to the sidebar */}
              <li>
                <button
                  onClick={() => handlePageChange("support")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base ${currentPage === "support"
                      ? "text-white bg-gradient-to-r from-orange-500 to-blue-500"
                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <Mail className="h-5 w-5" />
                  Support Tickets
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}