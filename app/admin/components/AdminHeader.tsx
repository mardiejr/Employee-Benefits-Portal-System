"use client"
import React, { useState, useRef } from 'react';
import { Search, User, ChevronDown, LogOut } from 'lucide-react';

interface AdminHeaderProps {
  adminName: string;
  handleLogout: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ adminName, handleLogout }) => {
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const profileRef = useRef<HTMLDivElement>(null);

  return (
    <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <img src="/Logo1.svg" alt="Company Logo" className="h-10" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-sm text-gray-600">Welcome back, {adminName}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
               
        {/* Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <User size={20} />
            </div>
            <span className="font-medium hidden md:block">Admin</span>
            <ChevronDown size={18} className="text-gray-500 hidden md:block" />
          </button>
          
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-10 overflow-hidden">
              <div className="p-3 border-b border-gray-200">
                <p className="font-semibold">{adminName} Kuyomi</p>
                <p className="text-sm text-gray-500">System Administrator</p>
              </div>
              <div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 text-red-600"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;