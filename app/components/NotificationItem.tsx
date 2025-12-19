// app/components/NotificationItem.tsx
import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface NotificationItemProps {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: number;
  referenceType?: string;
  onMarkAsRead: (id: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type,
  title,
  message,
  isRead,
  createdAt,
  referenceId,
  referenceType,
  onMarkAsRead
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const formattedDate = new Date(createdAt).toLocaleString();

  // Handle navigation based on notification type and content
  const handleViewDetails = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setIsLoading(true);
      
      // Mark as read
      if (!isRead) {
        await onMarkAsRead(id);
      }
      
      // Determine the appropriate URL based on notification characteristics
      let targetUrl = '/status'; // Default
      
      // Check for approval notifications
      if (type === 'requires-approval' || 
          title.toLowerCase().includes('requires your approval')) {
        targetUrl = '/approval';
      } 
      // Check for request status notifications
      else if (type === 'request-approved' || 
               type === 'request-rejected' ||
               title.toLowerCase().includes('approved') || 
               title.toLowerCase().includes('rejected')) {
        targetUrl = '/status';
      }
      // Check for support ticket notifications
      else if (referenceType === 'support_ticket' || 
               title.toLowerCase().includes('support ticket')) {
        targetUrl = '/notifications';
      }
      
      // Navigate to the target URL
      window.location.href = targetUrl;
      
    } catch (error) {
      console.error('Error handling notification action:', error);
      toast.error('Failed to process notification');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Determine the button text based on notification characteristics
  const getButtonText = () => {
    // For approval notifications
    if (type === 'requires-approval' || 
        title.toLowerCase().includes('requires your approval')) {
      return "View in Approval page";
    } 
    // For request status notifications
    else if (type === 'request-approved' || 
             type === 'request-rejected' ||
             title.toLowerCase().includes('approved') || 
             title.toLowerCase().includes('rejected')) {
      return "View in Status page";
    } 
    // Default text for other notifications
    else {
      return "View details";
    }
  };

  return (
    <div className={`border-b p-4 ${isRead ? 'bg-gray-50' : 'bg-blue-50'} hover:bg-gray-100`}>
      <div className="flex justify-between items-start">
        <h3 className={`text-sm font-semibold ${isRead ? 'text-gray-800' : 'text-blue-700'}`}>
          {title}
        </h3>
        <span className="text-xs text-gray-500">{formattedDate}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1 mb-2">{message}</p>
      
      <button
        onClick={handleViewDetails}
        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center"
        disabled={isLoading}
      >
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        {getButtonText()}
        {isLoading && (
          <div className="w-3 h-3 ml-1 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        )}
      </button>
    </div>
  );
};

export default NotificationItem;