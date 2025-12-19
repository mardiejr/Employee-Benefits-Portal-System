// app/components/EmployeeNavbar.tsx

"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "./LogoutButton";
import { Bell, X, CheckCircle, MessageSquare, ExternalLink, Menu } from 'lucide-react';

interface EmployeeNavbarProps {
  isApprover?: boolean;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  reference_id: number;
  reference_type: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

const EmployeeNavbar: React.FC<EmployeeNavbarProps> = ({ isApprover = false }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIcon(null);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Fetch notifications on component mount
    fetchNotifications();

    // Set up polling every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, is_read: true }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }

    return date.toLocaleDateString();
  };

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    setActiveIcon(notificationsOpen ? null : "notifications");
  };

  const viewTicketDetails = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    setNotificationsOpen(false);
    setActiveIcon(null);  // <-- Added this line
    router.push('/status');
  };

  // Helper to generate the notification link - checks notification type
  // In EmployeeNavbar.tsx

  const getNotificationAction = (notification: Notification) => {
    // For notifications requiring approval
    if (notification.type === 'requires-approval' ||
      notification.title.toLowerCase().includes('requires your approval')) {
      return (
        <button
          onClick={async () => {
            // Mark notification as read first
            await markNotificationAsRead(notification.id);

            // Close notification dropdown and reset active icon
            setNotificationsOpen(false);
            setActiveIcon(null);

            // Navigate to approval page
            window.location.href = '/approval';
          }}
          className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          View in Approval page
        </button>
      );
    }

    // For approved/rejected notifications
    if (notification.type === 'request-approved' ||
      notification.type === 'request-rejected' ||
      notification.title.toLowerCase().includes('approved') ||
      notification.title.toLowerCase().includes('rejected')) {
      return (
        <button
          onClick={async () => {
            // Mark notification as read
            await markNotificationAsRead(notification.id);

            // Close dropdown and reset icon
            setNotificationsOpen(false);
            setActiveIcon(null);

            // Navigate to status page
            window.location.href = '/status';
          }}
          className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          View in Status page
        </button>
      );
    }

    // For support ticket notifications
    if (notification.reference_type === 'support_ticket' ||
      notification.title.toLowerCase().includes('support ticket')) {
      return (
        <button
          onClick={async () => {
            // Mark notification as read
            await markNotificationAsRead(notification.id);

            // Close dropdown and reset icon
            setNotificationsOpen(false);
            setActiveIcon(null);

            // Navigate to notifications page
            window.location.href = '/notifications';
          }}
          className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          View details
        </button>
      );
    }

    // Default action for other notifications
    return (
      <button
        onClick={async () => {
          // Mark notification as read
          await markNotificationAsRead(notification.id);

          // Close dropdown and reset icon
          setNotificationsOpen(false);
          setActiveIcon(null);

          // Default navigation
          window.location.href = '/notifications';
        }}
        className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center"
      >
        <ExternalLink className="w-3 h-3 mr-1" />
        View details
      </button>
    );
  };

  const handleMobileLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Fixed navbar that stays at the top when scrolling */}
      <nav className="fixed top-0 left-0 right-0 w-full bg-white shadow-md px-4 md:px-8 py-4 flex justify-between items-center z-50">
        <div className="flex items-center space-x-2">
          <img src="/Logo1.svg" alt="CompanyLogo" className="h-8 md:h-10" />
        </div>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex space-x-8 text-gray-700 font-medium">
          <li className="cursor-pointer hover:text-blue-600">
            <Link href="/dashboard">Home</Link>
          </li>
          <li className="cursor-pointer hover:text-blue-600">
            <Link href="/benefits">My Benefits</Link>
          </li>
          <li className="cursor-pointer hover:text-blue-600">
            <Link href="/booking">House Booking</Link>
          </li>
        </ul>

        <div className="flex space-x-3 items-center">
          {/* Notifications Bell */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative"
            >
              <Bell
                className={`h-8 w-8 md:h-10 md:w-10 p-2 inline-flex items-center justify-center rounded-full
                  ${activeIcon === "notifications" ? "bg-blue-200 text-blue-600" : "text-gray-600 hover:bg-gray-100"}`}
              />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 animate-fade-in z-50">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto max-h-80">
                  {notificationsLoading ? (
                    <div className="py-8 text-center text-gray-500">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    <div>
                      {notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">{notification.title}</h4>
                            <span className="text-xs text-gray-500">{formatNotificationDate(notification.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>

                          <div className="flex justify-between items-center mt-1">
                            {getNotificationAction(notification)}

                            {!notification.is_read && (
                              <button
                                onClick={() => markNotificationAsRead(notification.id)}
                                className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-2 text-center border-t border-gray-200">
                  <Link href="/notifications" className="text-xs text-blue-600 hover:text-blue-800">
                    Visit notification page
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Profile dropdown */}
          <div className="hidden md:block relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setOpen(!open);
                setActiveIcon(activeIcon === "profile" ? null : "profile");
              }}
            >
              <img
                src="/icons/profile.svg"
                alt="User"
                className={`h-10 w-10 inline-flex items-center justify-center rounded-full p-1 
                  ${activeIcon === "profile" ? "bg-blue-200" : "hover:bg-gray-100"}`}
              />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 animate-fade-in z-50">
                <ul className="py-2 text-gray-700">
                  <li>
                    <Link
                      href="/account"
                      className={`block px-4 py-2 hover:bg-gray-100 ${currentPath === '/account' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                    >
                      My Account
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/status"
                      className={`block px-4 py-2 hover:bg-gray-100 ${currentPath === '/status' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                    >
                      My Status
                    </Link>
                  </li>
                  {/* Added Loan Deductions link here, right below the Status option */}
                  <li>
                    <Link
                      href="/loan/deductions"
                      className={`block px-4 py-2 hover:bg-gray-100 ${currentPath === '/loan/deductions' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                    >
                      Loan Deductions
                    </Link>
                  </li>
                  {/* Conditionally render the Approvals link only for approvers */}
                  {isApprover && (
                    <li>
                      <Link
                        href="/approval"
                        className={`block px-4 py-2 hover:bg-gray-100 ${currentPath === '/approval' ? 'bg-blue-50 text-blue-600' : ''
                          }`}
                      >
                        Approvals
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link
                      href="/policy"
                      className={`block px-4 py-2 hover:bg-gray-100 ${currentPath === '/policy' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                    >
                      Policy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/support"
                      className={`block px-4 py-2 hover:bg-gray-100 ${currentPath === '/support' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                    >
                      Support
                    </Link>
                  </li>
                  <li>
                    <LogoutButton className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">
                      Log Out
                    </LogoutButton>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu */}
          <div className="md:hidden relative" ref={mobileMenuRef}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>

            {mobileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 animate-fade-in z-50">
                <div className="py-2">
                  {/* Navigation Links */}
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Navigation</p>
                  </div>
                  <Link
                    href="/dashboard"
                    className={`block px-4 py-3 hover:bg-gray-100 ${currentPath === '/dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    onClick={handleMobileLinkClick}
                  >
                    Home
                  </Link>
                  <Link
                    href="/benefits"
                    className={`block px-4 py-3 hover:bg-gray-100 ${currentPath === '/benefits' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    onClick={handleMobileLinkClick}
                  >
                    My Benefits
                  </Link>
                  <Link
                    href="/booking"
                    className={`block px-4 py-3 hover:bg-gray-100 ${currentPath === '/booking' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    onClick={handleMobileLinkClick}
                  >
                    House Booking
                  </Link>

                  {/* Account Links */}
                  <div className="px-4 py-2 border-t border-b border-gray-200 mt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Account</p>
                  </div>
                  <Link
                    href="/account"
                    className={`block px-4 py-3 hover:bg-gray-100 ${currentPath === '/account' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    onClick={handleMobileLinkClick}
                  >
                    My Account
                  </Link>
                  <Link
                    href="/status"
                    className={`block px-4 py-3 hover:bg-gray-100 ${currentPath === '/status' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    onClick={handleMobileLinkClick}
                  >
                    My Status
                  </Link>
                  <Link
                    href="/loan/deductions"
                    className={`block px-4 py-3 hover:bg-gray-100 ${currentPath === '/loan/deductions' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    onClick={handleMobileLinkClick}
                  >
                    Loan Deductions
                  </Link>
                  {isApprover && (
                    <Link
                      href="/approval"
                      className={`block px-4 py-3 hover:bg-gray-100 ${currentPath === '/approval' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      onClick={handleMobileLinkClick}
                    >
                      Approvals
                    </Link>
                  )}
                  <Link
                    href="/policy"
                    className={`block px-4 py-3 hover:bg-gray-100 ${currentPath === '/policy' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    onClick={handleMobileLinkClick}
                  >
                    Policy
                  </Link>
                  <Link
                    href="/support"
                    className={`block px-4 py-3 hover:bg-gray-100 ${currentPath === '/support' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    onClick={handleMobileLinkClick}
                  >
                    Support
                  </Link>

                  {/* Logout */}
                  <div className="border-t border-gray-200 mt-2">
                    <LogoutButton className="block w-full text-left px-4 py-3 hover:bg-gray-100 text-red-600">
                      Log Out
                    </LogoutButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* This div adds necessary padding to the content to prevent it from being hidden behind the fixed navbar */}
      <div className="pt-16 md:pt-20">
        {/* This empty div is used to push content below the fixed navbar */}
      </div>
    </>
  );
};

export default EmployeeNavbar;