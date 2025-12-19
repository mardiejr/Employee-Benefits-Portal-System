// Simple Payment Modal Component
import { useState } from "react";

interface SimplePaymentModalProps {
  loanId: string;
  loanType: string;
  employeeName: string;
  loanAmount: number;
  remainingAmount: number;
  onClose: () => void;
  onSubmit: (amount: number, notes: string) => Promise<void>;
}

export default function SimplePaymentModal({
  loanId,
  loanType,
  employeeName,
  loanAmount,
  remainingAmount,
  onClose,
  onSubmit
}: SimplePaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Handle submit action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      return; // Don't submit if amount is invalid
    }
    
    setIsProcessing(true);
    
    try {
      await onSubmit(parseFloat(paymentAmount), paymentNotes);
      onClose();
    } catch (error) {
      console.error("Payment processing error:", error);
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Process Payment</h3>
          
          <p className="text-gray-600 mb-4">
            Enter the payment amount for {employeeName}'s {loanType.toLowerCase()}.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">₱</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingAmount}
                  className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                  placeholder="Enter payment amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Remaining balance: {formatCurrency(remainingAmount)}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Notes (Optional)
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                rows={3}
                placeholder="Enter any notes about this payment"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                disabled={isProcessing || !paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </>
                ) : (
                  "Process Payment"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}