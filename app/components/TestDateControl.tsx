// TestDateControl.tsx
"use client";

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface TestDateControlProps {
  onRefresh?: () => void; // Optional callback to refresh data after successful update
}

const TestDateControl = ({ onRefresh }: TestDateControlProps) => {
  const [testDate, setTestDate] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const handleTestDeductions = async () => {
    if (!testDate) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/test/loan-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testDate })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Updated deductions using test date: ${testDate}`);
        // Either reload the page or use the callback
        if (onRefresh) {
          onRefresh();
        } else {
          window.location.reload();
        }
      } else {
        toast.error(data.error || 'Failed to update deductions');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to process test date');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-yellow-50 p-3 mb-4 rounded border border-yellow-300">
      <button 
        onClick={() => setShowPanel(!showPanel)} 
        className="font-medium text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800"
      >
        {showPanel ? '− Hide' : '+ Show'} Test Date Controls (Admin Only)
      </button>
      
      {showPanel && (
        <div className="mt-3">
          <p className="text-sm text-gray-700 mb-2">
            This will update loan deduction statuses as if today were the selected date.
            Use this for testing future deductions.
          </p>
          
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <button
              onClick={handleTestDeductions}
              disabled={processing || !testDate}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded disabled:bg-gray-300 flex items-center gap-1"
            >
              {processing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                'Apply Test Date'
              )}
            </button>
            
            {testDate && (
              <span className="text-xs bg-blue-50 text-blue-800 py-1 px-2 rounded">
                Testing with date: {new Date(testDate).toLocaleDateString()}
              </span>
            )}
          </div>
          
          <p className="text-xs mt-3 text-gray-500">
            Note: This is for testing purposes only. Updates will be logged in the system.
          </p>
        </div>
      )}
    </div>
  );
};

export default TestDateControl;