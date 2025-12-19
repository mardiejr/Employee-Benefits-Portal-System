"use client"
import React, { useState, useRef, useEffect } from 'react';
import { Mail, Phone, Upload, X, Send, CheckCircle, AlertCircle } from 'lucide-react';
import LogoutButton from "../components/LogoutButton";
import useAuth from "../hooks/useAuth";
import EmployeeNavbar from "../components/EmployeeNavbar"; 
import useUserProfile from "../hooks/useUserProfile";

type TicketCategory = 'Medical LOA' | 'Medical Reimbursement' | 'Car Loan' | 'Salary Loan' | 'Housing Loan' | 'House Booking' | 'General Bug' | 'Other';

interface Attachment {
  id: string;
  file: File;
  preview: string;
}

interface UserProfile {
  employee_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
}

const SupportPage = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    category: '' as TicketCategory | '',
    subject: '',
    description: '',
  });
  const { handleApiError } = useAuth();
  const { isApprover, loading } = useUserProfile();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
          // Auto-populate the form with user data
          setFormData(prev => ({
            ...prev,
            first_name: data.first_name || '',
            middle_name: data.middle_name || '',
            last_name: data.last_name || '',
            email: data.email || '',
          }));
        } else {
          console.error('Failed to fetch user profile');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const categories: TicketCategory[] = [
    'Medical LOA',
    'Medical Reimbursement',
    'Car Loan',
    'Salary Loan',
    'Housing Loan',
    'House Booking',
    'General Bug',
    'Other'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when the field is being edited
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newAttachment: Attachment = {
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: event.target?.result as string,
          };
          setAttachments(prev => [...prev, newAttachment]);
          
          // Clear attachment validation error when a file is added
          if (validationErrors['attachment']) {
            setValidationErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors['attachment'];
              return newErrors;
            });
          }
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.category) errors.category = 'Please select a category';
    if (!formData.subject.trim()) errors.subject = 'Subject is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (attachments.length === 0) errors.attachment = 'Please upload at least one image';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Create FormData object to handle file uploads
      const submitData = new FormData();
      submitData.append('first_name', formData.first_name);
      submitData.append('middle_name', formData.middle_name || '');
      submitData.append('last_name', formData.last_name);
      submitData.append('email', formData.email);
      submitData.append('category', formData.category);
      submitData.append('subject', formData.subject);
      submitData.append('description', formData.description);
      
      // Add the first attachment (required)
      if (attachments.length > 0) {
        submitData.append('attachment', attachments[0].file);
      }
      
      // Send the data to the API
      const response = await fetch('/api/support/submit', {
        method: 'POST',
        body: submitData,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Ticket submitted successfully:', data);
        setSubmitStatus('success');
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setFormData({
            ...formData,
            category: '',
            subject: '',
            description: '',
          });
          setAttachments([]);
          setSubmitStatus('idle');
        }, 3000);
      } else {
        console.error('Failed to submit ticket:', await response.json());
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
     <EmployeeNavbar isApprover={isApprover} />
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">How can we help you?</h1>
          <p className="text-lg text-gray-600">Submit a support ticket or reach out to us directly</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Contact Information</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Support</p>
                    <a href="mailto:support@insularlife.com" className="text-sm text-blue-600 hover:underline">
                      support@insularlife.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Support Hotline</p>
                    <a href="tel:+6328582000" className="text-sm text-blue-600 hover:underline">
                      (02) 8582-2000
                    </a>
                    <p className="text-xs text-gray-500 mt-1">Mon-Fri: 8:00 AM - 5:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Expected Response Time</h3>
              <p className="text-sm text-blue-800">We typically respond within 24-48 hours during business days.</p>
            </div>
          </div>

          {/* Ticket Submission Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Submit a Support Ticket</h2>

              {submitStatus === 'success' && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">Your ticket has been submitted successfully! We'll get back to you soon.</p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-800">Something went wrong. Please try again.</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${validationErrors.first_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Juan"
                      readOnly={!!userProfile} // Make read-only if profile data is available
                    />
                    {validationErrors.first_name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="middle_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      id="middle_name"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Dela"
                      readOnly={!!userProfile} // Make read-only if profile data is available
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${validationErrors.last_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Cruz"
                      readOnly={!!userProfile} // Make read-only if profile data is available
                    />
                    {validationErrors.last_name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.last_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${validationErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="juan.delacruz@company.com"
                      readOnly={!!userProfile} // Make read-only if profile data is available
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${validationErrors.category ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {validationErrors.category && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.category}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${validationErrors.subject ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Brief description of your issue"
                  />
                  {validationErrors.subject && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.subject}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={5}
                    className={`w-full px-4 py-2 border ${validationErrors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
                    placeholder="Please provide detailed information about your issue..."
                  />
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachments (Screenshots) *
                  </label>
                  <div className={`border-2 border-dashed ${validationErrors.attachment ? 'border-red-500' : 'border-gray-300'} rounded-lg p-6 text-center hover:border-blue-400 transition-colors`}>
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        <span className="text-blue-600 hover:underline">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                    </label>
                  </div>
                  {validationErrors.attachment && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.attachment}</p>
                  )}

                  {attachments.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {attachments.map(att => (
                        <div key={att.id} className="relative group">
                          <img
                            src={att.preview}
                            alt={att.file.name}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-gray-600 mt-1 truncate">{att.file.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SupportPage;