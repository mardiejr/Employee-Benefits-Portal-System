"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function useAuth() {
  const router = useRouter();

  useEffect(() => {

    const checkAuth = () => {
      const employee = sessionStorage.getItem('employee');
      if (!employee) {
        window.location.href = '/?needsignin=true';
        return false;
      }
      return true;
    };

    if (!checkAuth()) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    handleApiError: (error: any) => {
      console.error('API Error:', error);
      const employee = sessionStorage.getItem('employee');
      if (!employee) {
        window.location.href = '/?needsignin=true';
        return true;
      }
      return false; 
    }
  };
}