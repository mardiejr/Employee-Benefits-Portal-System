"use client";
import React, { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Camera, Check, X, Eye, EyeOff, Package } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import LogoutButton from "../components/LogoutButton";
import useAuth from "../hooks/useAuth";
import EmployeeNavbar from "../components/EmployeeNavbar"; 
import useUserProfile from "../hooks/useUserProfile";


interface UserProfile {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  nationality: string;
  address: string;
  phone_number: string;
  email: string;
  department: string;
  position: string;
  hire_date: string;
  profile_picture?: string;
  employee_id: string;
  last_password_change?: string;
  benefits_package?: string;
  benefits_amount_remaining?: number;
}

export default function AccountPage() {
  const { handleApiError } = useAuth();
  const { isApprover } = useUserProfile();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({});
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState({current: false, new: false, confirm: false});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const response = await fetch('/api/user/profile');
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch profile');
        setUserProfile(await response.json());
      } catch (err) {
        setError('Unable to load profile information');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUserProfile();
  }, [router]);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
  };
  
  // Format last password change
  const formatLastPasswordChange = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
  };

  // Format currency
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "₱0.00";
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get full name
  const getFullName = () => {
    if (!userProfile) return "—";
    const { first_name, middle_name, last_name } = userProfile;
    return `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`;
  };

  // Profile picture handlers
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const saveProfilePicture = async () => {
    if (!selectedFile || !userProfile) return;
    setUploadLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('profilePicture', selectedFile);
      formData.append('employeeId', userProfile.employee_id);
      
      const response = await fetch('/api/user/update-profile-picture', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to update profile picture');
      
      const result = await response.json();
      setUserProfile(prev => prev ? { 
        ...prev,
        profile_picture: result.profile_picture_url
      } : null);
      
      toast.success('Profile picture updated successfully');
      setIsEditingPhoto(false);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err) {
      console.error('Error updating profile picture:', err);
      toast.error('Failed to update profile picture');
    } finally {
      setUploadLoading(false);
    }
  };

  // Password change handlers
  const handlePasswordInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordFormData(prev => ({...prev, [name]: value}));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validatePasswordForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!passwordFormData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordFormData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordFormData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (!passwordFormData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;
    
    try {
      setPasswordSubmitting(true);
      
      const response = await fetch('/api/user/update-password', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          currentPassword: passwordFormData.currentPassword,
          newPassword: passwordFormData.newPassword,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update password');
      }
      
      // Update the last_password_change in the profile
      setUserProfile(prev => prev ? {
        ...prev,
        last_password_change: new Date().toISOString()
      } : null);
      
      toast.success('Password updated successfully');
      setIsChangingPassword(false);
      setPasswordFormData({currentPassword: '', newPassword: '', confirmPassword: ''});
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Profile not found"}</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <EmployeeNavbar isApprover={isApprover} />
      <Toaster position="top-right" />     

      {/* Profile Content */}
      <main className="flex-grow px-4 md:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h1 className="text-2xl font-semibold text-gray-800 border-b pb-4 mb-6">My Account</h1>
            
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-10">
              <div className="relative group">
                {/* Profile Picture */}
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-md relative">
                  {isEditingPhoto && previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : userProfile.profile_picture ? (
                    <img src={userProfile.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <img src="/Logo1.svg" alt="Profile" className="w-full h-full p-2" />
                  )}
                  
                  {/* Edit Button Overlay */}
                  {!isEditingPhoto && (
                    <button 
                      onClick={() => setIsEditingPhoto(true)}
                      className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <Camera className="h-8 w-8 text-white" />
                    </button>
                  )}
                </div>
                
                {/* Photo Edit Controls */}
                {isEditingPhoto && (
                  <div className="mt-2 flex justify-center gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"
                      title="Choose photo"
                    >
                      <Camera size={18} />
                    </button>
                    
                    {previewUrl && (
                      <>
                        <button 
                          onClick={saveProfilePicture}
                          disabled={uploadLoading}
                          className={`p-2 ${uploadLoading ? 'bg-blue-100 text-blue-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} rounded-full`}
                          title="Save photo"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setIsEditingPhoto(false);
                            setPreviewUrl(null);
                            setSelectedFile(null);
                          }}
                          className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100"
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </>
                    )}
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                )}
              </div>
              
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-semibold">{getFullName()}</h2>
                <p className="text-gray-600 font-medium text-lg">{userProfile.position || "—"}</p>
                <p className="text-gray-500">{userProfile.department || "—"}</p>
                <div className="mt-2 inline-flex items-center text-blue-600 text-sm">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                  Active Employee
                </div>
                <p className="text-gray-500 text-sm mt-1">ID: {userProfile.employee_id || "—"}</p>
              </div>
            </div>

            {/* Profile Details Section */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Personal Details */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 hover:shadow-md transition duration-300">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  Personal Details
                </h3>
                <div className="space-y-3 text-sm">
                  <p><span className="font-medium text-gray-600">Full Name:</span> <span className="text-gray-800">{getFullName()}</span></p>
                  <p><span className="font-medium text-gray-600">Gender:</span> <span className="text-gray-800">{userProfile.gender || "—"}</span></p>
                  <p><span className="font-medium text-gray-600">Nationality:</span> <span className="text-gray-800">{userProfile.nationality || "—"}</span></p>
                  <p><span className="font-medium text-gray-600">Address:</span> <span className="text-gray-800">{userProfile.address || "—"}</span></p>
                  <p><span className="font-medium text-gray-600">Phone Number:</span> <span className="text-gray-800">{userProfile.phone_number || "—"}</span></p>
                </div>
              </div>

              {/* Account Details */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 hover:shadow-md transition duration-300">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  Employment Details
                </h3>
                <div className="space-y-3 text-sm">
                  <p><span className="font-medium text-gray-600">Email:</span> <span className="text-gray-800">{userProfile.email || "—"}</span></p>
                  <p><span className="font-medium text-gray-600">Department:</span> <span className="text-gray-800">{userProfile.department || "—"}</span></p>
                  <p><span className="font-medium text-gray-600">Position:</span> <span className="text-gray-800">{userProfile.position || "—"}</span></p>
                  <p><span className="font-medium text-gray-600">Hire Date:</span> <span className="text-gray-800">{formatDate(userProfile.hire_date)}</span></p>
                  <p>
                    <span className="font-medium text-gray-600">Status:</span> 
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium ml-1">Active</span>
                  </p>
                </div>
              </div>
              
              {/* Benefits Package Information - NEW SECTION */}
              <div className="md:col-span-2 bg-white shadow-sm rounded-lg border border-gray-200 p-6 hover:shadow-md transition duration-300">
                <div className="flex items-center mb-4">
                  <Package className="h-5 w-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-700">Benefits Package</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-600">Current Package:</span>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {userProfile.benefits_package || "No Package"}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-600">Package Details:</span>
                      <p className="mt-1 text-sm text-gray-700">
                        {userProfile.benefits_package === 'Package A' ? 
                          'Package A provides medical reimbursement benefits up to ₱100,000 per year.' : 
                          userProfile.benefits_package === 'Package B' ? 
                          'Package B provides medical reimbursement benefits up to ₱200,000 per year.' :
                          'No benefits package information available.'}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        Benefits reset at the beginning of each calendar year.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-600">Remaining Benefits Amount:</span>
                    <div className="mt-2 flex flex-col">
                      <span className="text-2xl font-bold text-blue-600">
                        {formatCurrency(userProfile.benefits_amount_remaining)}
                      </span>
                      
                      {userProfile.benefits_package && userProfile.benefits_amount_remaining !== undefined && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ 
                              width: `${(userProfile.benefits_amount_remaining / 
                                (userProfile.benefits_package === 'Package A' ? 100000 : 200000)) * 100}%` 
                            }}
                          ></div>
                        </div>
                      )}
                      
                      <p className="mt-2 text-sm text-gray-500">
                        {userProfile.benefits_amount_remaining !== undefined && userProfile.benefits_package ? 
                          `You have used ${formatCurrency(
                            (userProfile.benefits_package === 'Package A' ? 100000 : 200000) - 
                            (userProfile.benefits_amount_remaining || 0)
                          )} of your annual benefits amount.` :
                          'No benefits amount information available.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Sections - Password Change */}
            <div className="mt-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6 hover:shadow-md transition duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  Account Security
                </h3>
                {!isChangingPassword ? (
                  <button 
                    onClick={() => setIsChangingPassword(true)}
                    className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Change Password
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsChangingPassword(false)} 
                    className="text-gray-500 hover:text-gray-700 flex items-center text-sm"
                  >
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </button>
                )}
              </div>
              
              {!isChangingPassword ? (
                <div className="space-y-3 text-sm">
                  <p><span className="font-medium text-gray-600">Password:</span> <span className="text-gray-800">••••••••</span></p>
                  <p>
                    <span className="font-medium text-gray-600">Last Password Change:</span> 
                    <span className="text-gray-800 ml-1">
                      {userProfile.last_password_change 
                        ? formatLastPasswordChange(userProfile.last_password_change) 
                        : "Never changed"}
                    </span>
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {/* Current Password */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPassword.current ? "text" : "password"}
                        name="currentPassword"
                        value={passwordFormData.currentPassword}
                        onChange={handlePasswordInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Enter current password"
                      />
                      <button 
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(prev => ({...prev, current: !prev.current}))}
                      >
                        {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>
                    )}
                  </div>
                  
                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword.new ? "text" : "password"}
                        name="newPassword"
                        value={passwordFormData.newPassword}
                        onChange={handlePasswordInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Enter new password"
                      />
                      <button 
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(prev => ({...prev, new: !prev.new}))}
                      >
                        {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>
                    )}
                  </div>
                  
                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showPassword.confirm ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordFormData.confirmPassword}
                        onChange={handlePasswordInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Confirm new password"
                      />
                      <button 
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(prev => ({...prev, confirm: !prev.confirm}))}
                      >
                        {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                  
                  <div className="flex justify-end mt-4 space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="px-3 py-1.5 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                      disabled={passwordSubmitting}
                    >
                      {passwordSubmitting ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            <div className="mt-8 flex flex-wrap gap-4 justify-end">
              <Link href="/dashboard">
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Back to Dashboard
                </button>
              </Link>
              <Link href="/status">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  View My Requests
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}