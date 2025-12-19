// app/admin/logtrail/page.tsx
"use client";
import { useState, useEffect } from "react";
import { Shield, Download, Search, Filter, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";

export default function LogTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [filterType, filterUser, dateFrom, dateTo, currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    
    try {
      // Build the query parameters
      const params = new URLSearchParams();
      if (filterType !== "all") params.append("type", filterType);
      if (filterUser) params.append("user", filterUser);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      params.append("page", currentPage.toString());
      params.append("limit", "50"); // Default to 50 items per page
      
      const response = await fetch(`/api/admin/activity-logs?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch activity logs");
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
      
      // Update pagination info
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.totalItems);
      
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      toast.error(error.message || "Failed to fetch activity logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilterType("all");
    setFilterUser("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleExportToCSV = () => {
    // Create CSV content
    const headers = ['Timestamp', 'User', 'Action', 'Module', 'Details', 'Status'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.timestamp,
        `"${log.user_name}"`,
        log.action,
        `"${log.module}"`,
        `"${log.details}"`,
        log.status
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log_trail_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const actionColors: any = {
    LOGIN: "bg-blue-100 text-blue-800",
    LOGOUT: "bg-gray-100 text-gray-800",
    CREATE: "bg-green-100 text-green-800",
    UPDATE: "bg-yellow-100 text-yellow-800",
    DELETE: "bg-red-100 text-red-800",
    VIEW: "bg-purple-100 text-purple-800"
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Shield className="mr-2 text-gray-700" />
          Activity Logs
        </h1>
        <button
          onClick={handleExportToCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700 transition-colors"
        >
          <Download size={16} className="mr-2" />
          Export to CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label htmlFor="filterType" className="block text-sm font-medium text-gray-700 mb-1">
            Action Type
          </label>
          <select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
          >
            <option value="all">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="filterUser" className="block text-sm font-medium text-gray-700 mb-1">
            User
          </label>
          <div className="relative">
            <input
              type="text"
              id="filterUser"
              placeholder="Search by name or ID"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
            Date From
          </label>
          <div className="relative">
            <input
              type="date"
              id="dateFrom"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
            />
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div>
          <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
            Date To
          </label>
          <div className="relative">
            <input
              type="date"
              id="dateTo"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
            />
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleReset}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          Reset Filters
        </button>
        
        <div className="text-sm text-gray-600">
          Showing {logs.length} of {totalItems} logs
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Loading activity logs...
                </td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.user_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${actionColors[log.action] || "bg-gray-100 text-gray-800"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {log.module}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      log.status === "Success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No activity logs found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  );
}