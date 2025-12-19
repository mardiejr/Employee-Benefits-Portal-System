"use client";
import { useState, useEffect } from "react";

interface UserProfile {
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  department?: string;
  email?: string;
  isApprover?: boolean;
  [key: string]: any; 
}

/**
 * Custom hook to fetch the user profile and check if they're an approver
 * @returns {Object} User profile data, approver status, and loading state
 */
export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        // First get the user profile
        const profileResponse = await fetch('/api/user/profile');
        if (!profileResponse.ok) {
          console.error('Failed to fetch user profile');
          return;
        }
        
        const profileData = await profileResponse.json();
        setUserProfile(profileData);
        
        // Then check if the user has approval privileges by checking the approvers table
        const approverCheckResponse = await fetch('/api/user/check-approver');
        if (approverCheckResponse.ok) {
          const { isApprover } = await approverCheckResponse.json();
          setUserProfile((prevState: UserProfile | null) => 
            prevState ? { ...prevState, isApprover } : { isApprover }
          );
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Derive the isApprover value from the userProfile
  const isApprover = userProfile?.isApprover === true;

  return {
    userProfile,
    isApprover,
    loading
  };
}

export default useUserProfile;