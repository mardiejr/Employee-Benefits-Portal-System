// app/notifications/page.tsx

"use client"
import React, { useState, useEffect } from 'react';
import { CheckCircle, Bell, RefreshCw, ExternalLink, MessageSquare, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';
import EmployeeNavbar from "../components/EmployeeNavbar";
import useAuth from "../hooks/useAuth";
import useUserProfile from "../hooks/useUserProfile";

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

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { handleApiError } = useAuth();
  const { isApprover, loading } = useUserProfile();
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [expandedNotification, setExpandedNotification] = useState<number | null>(null);

  useEffect(() => {
    // Check authentication is handled by useAuth hook
    // We can fetch notifications directly when the component mounts
    if (!loading) {
      fetchNotifications();
    }
  }, [loading]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications');

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else {
        // This will handle unauthorized responses and redirect to login if needed
        handleApiError(response);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
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
        setUpdateStatus('success');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      } else {
        setUpdateStatus('error');
        setTimeout(() => setUpdateStatus('idle'), 3000);
        handleApiError(response);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 3000);
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
        setUpdateStatus('success');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      } else {
        setUpdateStatus('error');
        setTimeout(() => setUpdateStatus('idle'), 3000);
        handleApiError(response);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    }
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

  const getNotificationTypeIcon = (type: string) => {
    switch(type) {
      case 'support_resolved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const toggleExpandNotification = (notificationId: number) => {
    setExpandedNotification(prevId => prevId === notificationId ? null : notificationId);
    
    // Mark as read when expanding
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.is_read) {
      markNotificationAsRead(notificationId);
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeNavbar isApprover={isApprover} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900 flex items-center">
              <Bell className="w-6 h-6 mr-2" />
              Notifications
            </h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchNotifications}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </button>
              
              {notifications.some(n => !n.is_read) && (
                <button
                  onClick={markAllNotificationsAsRead}
                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Mark All as Read
                </button>
              )}
            </div>
          </div>

          {updateStatus === 'success' && (
            <div className="m-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center text-green-800">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              Notification status updated successfully
            </div>
          )}

          {updateStatus === 'error' && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
              Failed to update notification status
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">Loading your notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
              <MessageSquare className="w-16 h-16 opacity-20 mb-4" />
              <h3 className="text-lg font-medium mb-1">No Notifications</h3>
              <p className="text-sm">You don't have any notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 sm:px-6 ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationTypeIcon(notification.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">{notification.title}</h3>
                        <p className="text-xs text-gray-500">{formatDate(notification.created_at)}</p>
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        {expandedNotification === notification.id ? (
                          <div className="whitespace-pre-wrap">{notification.message}</div>
                        ) : (
                          <div className="truncate">{notification.message}</div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          onClick={() => toggleExpandNotification(notification.id)}
                          className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          {expandedNotification === notification.id ? (
                            <>
                              <Info className="w-3.5 h-3.5 mr-1" />
                              Hide details
                            </>
                          ) : (
                            <>
                              <Info className="w-3.5 h-3.5 mr-1" />
                              View details
                            </>
                          )}
                        </button>
                        
                        {!notification.is_read && (
                          <button
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-800"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && notifications.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 text-sm text-gray-500">
              Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;