// app/HRadmin/components/BenefitStatisticsModule.tsx
"use client";

import { useState, useEffect } from "react";
import { PieChart, BarChart3, Clock, Award, ChevronDown, ChevronUp, CheckCheck } from "lucide-react";
import useAuth from "../hooks/useAuth";

interface BenefitUtilization {
  benefit_type: string;
  total_count: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
}

interface ApprovalStat {
  current_approval_level: number;
  count: number;
  avg_days_in_level: string;
}

interface ProcessingTime {
  benefit_type: string;
  completed_count: number;
  avg_processing_days: string;
}

interface StatisticsData {
  benefitUtilization: BenefitUtilization[];
  approvalStats: ApprovalStat[];
  processingTimes: ProcessingTime[];
}

const BenefitStatisticsModule = () => {
  const { handleApiError } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatisticsData | null>(null);
  
  // Sections expanded/collapsed state
  const [expandedSections, setExpandedSections] = useState<{
    utilization: boolean;
    approvalStats: boolean;
    processingTimes: boolean;
  }>({
    utilization: true,
    approvalStats: true,
    processingTimes: true,
  });
  
  useEffect(() => {
    fetchStatistics();
  }, []);
  
  const fetchStatistics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/admin/benefit-stats");
      if (!response.ok) {
        throw new Error("Failed to fetch benefit statistics");
      }
      
      const result = await response.json();
      if (result.success) {
        // Adjust processing times to have minimum 0.1 days to avoid 0.0
        if (result.processingTimes && result.processingTimes.length > 0) {
          result.processingTimes = result.processingTimes.map(time => ({
            ...time,
            avg_processing_days: parseFloat(time.avg_processing_days) === 0 ? "0.1" : time.avg_processing_days
          }));
        }
        
        setData(result);
      } else {
        throw new Error(result.error || "Failed to load statistics");
      }
    } catch (err: any) {
      console.error("Error loading benefit statistics:", err);
      setError(err.message || "Failed to load statistics");
      if (handleApiError) handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };
  
  // Calculate totals for the benefit utilization section
  const getTotalRequests = () => {
    if (!data?.benefitUtilization) return 0;
    return data.benefitUtilization.reduce((acc, item) => acc + Number(item.total_count), 0);
  };
  
  const getApprovalRate = () => {
    if (!data?.benefitUtilization) return "0%";
    
    const total = data.benefitUtilization.reduce((acc, item) => acc + Number(item.total_count), 0);
    const approved = data.benefitUtilization.reduce((acc, item) => acc + Number(item.approved_count), 0);
    
    if (total === 0) return "0%";
    return `${Math.round((approved / total) * 100)}%`;
  };
  
  // Calculate most used benefit
  const getMostUsedBenefit = () => {
    if (!data?.benefitUtilization || data.benefitUtilization.length === 0) return "None";
    
    const mostUsed = data.benefitUtilization.reduce((prev, current) => 
      Number(prev.total_count) > Number(current.total_count) ? prev : current
    );
    
    return mostUsed.benefit_type;
  };
  
  // Calculate average processing time
  const getAverageProcessingTime = () => {
    if (!data?.processingTimes || data.processingTimes.length === 0) return "0 days";
    
    const totalDays = data.processingTimes.reduce((acc, item) => {
      return acc + (parseFloat(item.avg_processing_days) * Number(item.completed_count));
    }, 0);
    
    const totalRequests = data.processingTimes.reduce((acc, item) => 
      acc + Number(item.completed_count), 0
    );
    
    if (totalRequests === 0) return "0 days";
    return `${(totalDays / totalRequests).toFixed(1)} days`;
  };

  // Get the benefit with shortest/longest approval time
  const getFastestBenefit = () => {
    if (!data?.processingTimes || data.processingTimes.length === 0) return "None";
    
    return data.processingTimes.reduce((prev, current) => 
      parseFloat(prev.avg_processing_days) < parseFloat(current.avg_processing_days) ? prev : current
    ).benefit_type;
  };
  
  const getSlowestBenefit = () => {
    if (!data?.processingTimes || data.processingTimes.length === 0) return "None";
    
    return data.processingTimes.reduce((prev, current) => 
      parseFloat(prev.avg_processing_days) > parseFloat(current.avg_processing_days) ? prev : current
    ).benefit_type;
  };
  
  // Get color class based on benefit type
  const getBenefitColor = (benefitType: string) => {
    switch (benefitType) {
      case "Medical LOA": return "bg-blue-500";
      case "Medical Reimbursement": return "bg-green-500";
      case "Staff House Booking": return "bg-yellow-500";
      case "Salary Loan": return "bg-purple-500";
      case "Housing Loan": return "bg-orange-500";
      case "Car Loan": return "bg-teal-500";
      default: return "bg-gray-500";
    }
  };

  // Generate pie chart segments for a benefit
  const renderPieChart = (benefit: BenefitUtilization) => {
    const total = Number(benefit.total_count);
    if (total === 0) return null;
    
    const approvedPct = (Number(benefit.approved_count) / total) * 100;
    const rejectedPct = (Number(benefit.rejected_count) / total) * 100;
    const pendingPct = (Number(benefit.pending_count) / total) * 100;
    
    // Create conic gradient for pie chart
    const conicGradient = `conic-gradient(
      #16a34a 0% ${approvedPct}%, 
      #ef4444 ${approvedPct}% ${approvedPct + rejectedPct}%, 
      #f59e0b ${approvedPct + rejectedPct}% 100%
    )`;
    
    return (
      <div className="relative w-12 h-12 rounded-full" style={{ background: conicGradient }}>
        <div className="absolute inset-2 bg-white rounded-full"></div>
      </div>
    );
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-100 rounded mb-4"></div>
        <div className="h-40 bg-gray-100 rounded"></div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h2 className="text-base font-bold text-gray-800 mb-2">Benefit Utilization & Approval Statistics</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          <p>Failed to load statistics: {error}</p>
          <button 
            onClick={fetchStatistics}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // Render data
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Benefit Utilization & Approval Statistics</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <BarChart3 size={18} />
            <span className="text-xs font-medium">Total Requests</span>
          </div>
          <p className="text-xl font-bold text-blue-800">{getTotalRequests()}</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-500 mb-1">
            <CheckCheck size={18} />
            <span className="text-xs font-medium">Approval Rate</span>
          </div>
          <p className="text-xl font-bold text-green-800">{getApprovalRate()}</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-500 mb-1">
            <Award size={18} />
            <span className="text-xs font-medium">Most Used</span>
          </div>
          <p className="text-xl font-bold text-purple-800 truncate" title={getMostUsedBenefit()}>
            {getMostUsedBenefit()}
          </p>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <Clock size={18} />
            <span className="text-xs font-medium">Avg. Processing</span>
          </div>
          <p className="text-xl font-bold text-orange-800">{getAverageProcessingTime()}</p>
        </div>
      </div>
      
      {/* Benefit Utilization */}
      <div className="border rounded-lg mb-6 overflow-hidden">
        <button 
          onClick={() => toggleSection("utilization")}
          className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border-b"
        >
          <div className="flex items-center gap-2">
            <PieChart size={18} className="text-blue-500" />
            <h3 className="font-medium">Benefit Utilization</h3>
          </div>
          {expandedSections.utilization ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.utilization && data?.benefitUtilization && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-gray-600">Benefit Type</th>
                    <th className="text-center py-2 font-medium text-gray-600">Total</th>
                    <th className="text-center py-2 font-medium text-gray-600">Approved</th>
                    <th className="text-center py-2 font-medium text-gray-600">Pending</th>
                    <th className="text-center py-2 font-medium text-gray-600">Rejected</th>
                    <th className="text-center py-2 font-medium text-gray-600">Status Distribution</th>
                    <th className="text-center py-2 font-medium text-gray-600">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {data.benefitUtilization.map((benefit, index) => (
                    <tr key={index} className="border-b last:border-none hover:bg-gray-50">
                      <td className="py-3 flex items-center gap-2">
                        <span className={`${getBenefitColor(benefit.benefit_type)} w-3 h-3 rounded-full`}></span>
                        {benefit.benefit_type}
                      </td>
                      <td className="text-center py-3">{benefit.total_count}</td>
                      <td className="text-center py-3 text-green-600">{benefit.approved_count}</td>
                      <td className="text-center py-3 text-yellow-600">{benefit.pending_count}</td>
                      <td className="text-center py-3 text-red-600">{benefit.rejected_count}</td>
                      <td className="text-center py-3">
                        <div className="flex justify-center">
                          {renderPieChart(benefit)}
                        </div>
                        <div className="mt-1 flex justify-center gap-2 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>A
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>R
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>P
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ 
                                width: `${getTotalRequests() > 0 ? (Number(benefit.total_count) / getTotalRequests()) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">
                            {getTotalRequests() > 0 ? `${Math.round((Number(benefit.total_count) / getTotalRequests()) * 100)}%` : '0%'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Approval Statistics */}
      <div className="border rounded-lg mb-6 overflow-hidden">
        <button 
          onClick={() => toggleSection("approvalStats")}
          className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border-b"
        >
          <div className="flex items-center gap-2">
            <Award size={18} className="text-green-500" />
            <h3 className="font-medium">Approval Statistics</h3>
          </div>
          {expandedSections.approvalStats ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.approvalStats && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-3">Pending Requests by Approval Level</h4>
                <div className="space-y-4">
                  {data?.approvalStats && data.approvalStats.length > 0 ? (
                    data.approvalStats.map((stat, index) => (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            Level {stat.current_approval_level}: {
                              stat.current_approval_level === 1 ? "HR" :
                              stat.current_approval_level === 2 ? "Supervisor/Division Manager" :
                              stat.current_approval_level === 3 ? "Vice President" : "President"
                            }
                          </span>
                          <span className="text-sm text-gray-600">{stat.count} pending</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              stat.current_approval_level === 1 ? "bg-blue-600" :
                              stat.current_approval_level === 2 ? "bg-green-600" :
                              stat.current_approval_level === 3 ? "bg-yellow-600" : "bg-red-600"
                            }`}
                            style={{ 
                              width: `${Math.min(100, Number(stat.count) * 5)}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Avg. time in this level: {stat.avg_days_in_level} days
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No pending approvals</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-3">Processing Time Analysis</h4>
                
                <div className="space-y-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-xs font-medium text-gray-600 mb-2">Fastest Approval Process</h5>
                    <div className="flex items-center gap-2">
                      <span className={`${getBenefitColor(getFastestBenefit())} w-3 h-3 rounded-full`}></span>
                      <span className="font-medium">{getFastestBenefit()}</span>
                    </div>
                    
                    {data?.processingTimes?.map((item) => {
                      if (item.benefit_type === getFastestBenefit()) {
                        return (
                          <p key={item.benefit_type} className="text-sm text-gray-600 mt-1">
                            Average: {item.avg_processing_days} days ({item.completed_count} completed)
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-xs font-medium text-gray-600 mb-2">Slowest Approval Process</h5>
                    <div className="flex items-center gap-2">
                      <span className={`${getBenefitColor(getSlowestBenefit())} w-3 h-3 rounded-full`}></span>
                      <span className="font-medium">{getSlowestBenefit()}</span>
                    </div>
                    
                    {data?.processingTimes?.map((item) => {
                      if (item.benefit_type === getSlowestBenefit()) {
                        return (
                          <p key={item.benefit_type} className="text-sm text-gray-600 mt-1">
                            Average: {item.avg_processing_days} days ({item.completed_count} completed)
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Processing Times */}
      <div className="border rounded-lg overflow-hidden">
        <button 
          onClick={() => toggleSection("processingTimes")}
          className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border-b"
        >
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-orange-500" />
            <h3 className="font-medium">Processing Times by Benefit Type</h3>
          </div>
          {expandedSections.processingTimes ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.processingTimes && data?.processingTimes && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-gray-600">Benefit Type</th>
                    <th className="text-center py-2 font-medium text-gray-600">Completed Requests</th>
                    <th className="text-center py-2 font-medium text-gray-600">Avg. Processing Time (days)</th>
                    <th className="text-center py-2 font-medium text-gray-600">Comparison</th>
                  </tr>
                </thead>
                <tbody>
                  {data.processingTimes.map((item, index) => (
                    <tr key={index} className="border-b last:border-none hover:bg-gray-50">
                      <td className="py-3 flex items-center gap-2">
                        <span className={`${getBenefitColor(item.benefit_type)} w-3 h-3 rounded-full`}></span>
                        {item.benefit_type}
                      </td>
                      <td className="text-center py-3">{item.completed_count}</td>
                      <td className="text-center py-3 font-medium">{item.avg_processing_days}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                parseFloat(item.avg_processing_days) <= 3 ? "bg-green-600" :
                                parseFloat(item.avg_processing_days) <= 7 ? "bg-yellow-600" : "bg-red-600"
                              }`}
                              style={{ 
                                width: `${Math.min(100, (parseFloat(item.avg_processing_days) / 14) * 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {data.processingTimes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500 italic">
                        No processing time data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500 mt-4 text-right">
        Last updated: {new Date().toLocaleString()}
        <button 
          onClick={fetchStatistics} 
          className="ml-2 text-blue-500 hover:underline"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default BenefitStatisticsModule;