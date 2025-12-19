"use client";
import { useState, useEffect } from "react";
import { Database, Clock, TrendingUp, Calendar, Download, Trash2, AlertTriangle, X } from "lucide-react";

export default function DatabaseBackupPage() {
  // State for backup data and UI
  const [backups, setBackups] = useState<any[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupType, setBackupType] = useState("full");
  const [backupNote, setBackupNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [adminName, setAdminName] = useState<string>("");
  
  // State for backup schedule
  const [backupSchedule, setBackupSchedule] = useState({
    frequency: "daily",
    enabled: false,
    last_run: null,
    next_run: null
  });
  
  useEffect(() => {
    fetchBackups();
    getAdminName();
  }, []);
  
  // Get admin name from session storage or other sources
  const getAdminName = () => {
    try {
      // Try to get from session storage
      const employeeData = sessionStorage.getItem("employee");
      if (employeeData) {
        const employee = JSON.parse(employeeData);
        if (employee.firstName && employee.lastName) {
          setAdminName(`${employee.firstName} ${employee.lastName}`);
          return;
        }
      }
      
      // Fallback to a default name if not found
      setAdminName("Admin User");
    } catch (error) {
      console.error("Error getting admin name:", error);
      setAdminName("Admin User");
    }
  };
  
  // Fetch backups from the API
  const fetchBackups = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/database-backups');
      
      if (!response.ok) {
        throw new Error('Failed to fetch backups');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setBackups(data.backups || []);
        setBackupSchedule(data.schedule || {
          frequency: "daily",
          enabled: false,
          last_run: null,
          next_run: null
        });
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      setError('Failed to load backups. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a manual backup
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/database-backups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: backupType,
          note: backupNote
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create backup');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Add a temporary entry for the new backup
        const newBackup = {
          id: data.backupId,
          filename: data.filename,
          type: backupType === "full" ? "Full Backup" : "Incremental Backup",
          size: "0 KB",
          created_by: data.createdBy || adminName, // Use the name from API response or fallback to local state
          created_at: new Date().toISOString(),
          status: "In Progress",
          note: backupNote || "Manual backup"
        };
        
        setBackups([newBackup, ...backups]);
        setBackupNote("");
        
        // Show success alert
        alert("Backup initiated successfully! It will complete shortly.");
        
        // Refresh the backup list after a delay to show updated status
        setTimeout(() => {
          fetchBackups();
        }, 5000);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      setError('Failed to create backup. Please try again.');
    } finally {
      setIsCreatingBackup(false);
    }
  };
  
  // Download a backup
  const handleDownload = async (backupId: number, filename: string) => {
    try {
      // Direct the browser to the download endpoint
      window.location.href = `/api/admin/database-backups/download/${backupId}`;
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download backup file');
    }
  };
  
  // Delete a backup
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this backup?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/database-backups?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete backup');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setBackups(backups.filter(b => b.id !== id));
        alert('Backup deleted successfully');
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete backup');
    }
  };
  
  // Save backup schedule
  const handleSaveSchedule = async () => {
    try {
      const response = await fetch('/api/admin/database-backups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frequency: backupSchedule.frequency,
          enabled: backupSchedule.enabled
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setBackupSchedule(data.schedule);
        setScheduleModalOpen(false);
        alert('Backup schedule updated successfully');
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Schedule update error:', error);
      alert('Failed to update backup schedule');
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };
  
  // Get status color class
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get next scheduled backup text
  const getNextBackupText = () => {
    if (!backupSchedule.enabled) {
      return 'Automatic backups are disabled';
    }
    
    if (!backupSchedule.next_run) {
      return 'Not scheduled';
    }
    
    return `Next backup: ${formatDate(backupSchedule.next_run)}`;
  };
  
  // Get frequency display text
  const getFrequencyDisplayText = (frequency: string) => {
    switch (frequency) {
      case '8hours':
        return 'Every 8 Hours';
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      default:
        return frequency;
    }
  };

  // Render schedule modal
  const renderScheduleModal = () => {
    if (!scheduleModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Configure Backup Schedule</h3>
            <button 
              onClick={() => setScheduleModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup Frequency
            </label>
            <select
              value={backupSchedule.frequency}
              onChange={(e) => setBackupSchedule({...backupSchedule, frequency: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="8hours">Every 8 Hours</option>
              <option value="daily">Every Day</option>
              <option value="weekly">Every Week</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={backupSchedule.enabled}
                onChange={(e) => setBackupSchedule({...backupSchedule, enabled: e.target.checked})}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable automatic backups</span>
            </label>
          </div>
          
          {backupSchedule.last_run && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
              <p><strong>Last backup:</strong> {formatDate(backupSchedule.last_run)}</p>
              {backupSchedule.next_run && backupSchedule.enabled && (
                <p><strong>Next backup:</strong> {formatDate(backupSchedule.next_run)}</p>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSchedule}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Database Backup Management</h2>
        <p className="text-gray-600">Create, manage, and restore database backups</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-800 hover:text-red-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <Database className="h-10 w-10 mb-3 opacity-80" />
          <h3 className="text-2xl font-bold mb-1">{backups.length}</h3>
          <p className="text-blue-100">Total Backups</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
          <Clock className="h-10 w-10 mb-3 opacity-80" />
          <h3 className="text-2xl font-bold mb-1">{backups[0]?.created_at ? new Date(backups[0].created_at).toLocaleDateString() : "N/A"}</h3>
          <p className="text-green-100">Last Backup Date</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
          <Calendar className="h-10 w-10 mb-3 opacity-80" />
          <h3 className="text-lg font-bold mb-1">
            {backupSchedule.enabled 
              ? getFrequencyDisplayText(backupSchedule.frequency)
              : "Disabled"}
          </h3>
          <p className="text-purple-100">{getNextBackupText()}</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Create New Backup</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Backup Type</label>
            <select 
              value={backupType}
              onChange={(e) => setBackupType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreatingBackup}
            >
              <option value="full">Full Backup</option>
              <option value="incremental">Incremental Backup</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Backup Note (Optional)</label>
            <input
              type="text"
              value={backupNote}
              onChange={(e) => setBackupNote(e.target.value)}
              placeholder="e.g., Before system update"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreatingBackup}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            {isCreatingBackup ? "Creating Backup..." : "Create Backup Now"}
          </button>
          <button 
            onClick={() => setScheduleModalOpen(true)}
            disabled={isCreatingBackup}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Schedule Automatic Backup
          </button>
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Full backups include all database tables and data. 
            Incremental backups only include changes since the last full backup. Regular backups are essential for data recovery and disaster preparedness.
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Backup History</h3>
          <div className="flex gap-2">
            <button 
              onClick={fetchBackups}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
              disabled={isLoading}
            >
              <TrendingUp className="h-4 w-4" /> 
              Refresh
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
              <p>Loading backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No backups found</p>
              <p className="text-sm mt-1">Create your first backup to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                      {backup.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        backup.type === "Full Backup" 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-indigo-100 text-indigo-800"
                      }`}>
                        {backup.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backup.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backup.created_by}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(backup.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColorClass(backup.status)}`}>
                        {backup.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {backup.note || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleDownload(backup.id, backup.filename)}
                          disabled={backup.status !== 'Completed'}
                          className={`text-blue-600 hover:text-blue-800 font-medium ${
                            backup.status !== 'Completed' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={backup.status === 'Completed' ? 'Download' : 'Backup not ready for download'}
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(backup.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Backup Best Practices</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>Perform full backups at least once a week</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>Store backups in multiple secure locations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>Test backup restoration regularly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>Keep backup retention policy of 30-90 days</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>Document backup and recovery procedures</span>
            </li>
          </ul>
        </div>
      </div>
      
      {renderScheduleModal()}
    </div>
  );
}