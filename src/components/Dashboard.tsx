/**
 * Dashboard Component
 * 
 * Main dashboard interface that displays:
 * - Contract analysis statistics and risk distribution
 * - List of analyzed contracts with filtering and search
 * - Quick actions for new analysis
 * - Contract details and management
 * 
 * Features:
 * - Real-time data updates
 * - Risk level visualization
 * - Contract search and filtering
 * - Secure data management
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Eye,
  Trash2,
  TrendingUp,
  Shield,
  Clock,
  BarChart3,
  Sparkles,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { AnalysisResult } from '../types';
import Header from './header2';
import { useNavigate } from 'react-router-dom';
import { getContractsAnalyzed, getUserAnalyses } from '../services/analysisService';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

const db = getFirestore();

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<AnalysisResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'high-risk' | 'medium-risk' | 'low-risk'>('all');
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const [contractsAnalyzed, setContractsAnalyzed] = useState<number>(0);

  useEffect(() => {
    // Redirect to home if not logged in
    if (!user) {
      navigate('/');
      return;
    }

    setIsVisible(true);
    
    // Fetch user's analyses and contracts count from Firestore
    const fetchData = async () => {
      try {
        // Fetch analyses
        const analyses = await getUserAnalyses(user.id);
        // Sort analyses by date (newest first)
        const sortedAnalyses = analyses.sort((a, b) => 
          new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime()
        );
        
        // Limit to maxContracts for free plan
        const limitedAnalyses = user.maxContracts === 5 
          ? sortedAnalyses.slice(0, 5) 
          : sortedAnalyses;
          
        setContracts(limitedAnalyses);
        
        // Fetch contracts count
        const count = await getContractsAnalyzed(user.id);
        setContractsAnalyzed(count);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setContracts([]);
      }
    };
    
    fetchData();
  }, [user]); // Re-run when user changes

  // Use contractsAnalyzed from Firestore for docsLeft
  const docsLeft = user ? Math.max(0, user.maxContracts - contractsAnalyzed) : 0;
  const stats = {
    totalContracts: contracts.length,
    highRisk: contracts.filter((c: AnalysisResult) => c.riskLevel === 'High').length,
    mediumRisk: contracts.filter((c: AnalysisResult) => c.riskLevel === 'Medium').length,
    lowRisk: contracts.filter((c: AnalysisResult) => c.riskLevel === 'Low').length,
    avgCompletionScore: contracts.length > 0 
      ? Math.round(contracts.reduce((sum, c: AnalysisResult) => sum + c.completionScore, 0) / contracts.length)
      : 0
  };

  const filteredContracts = contracts.filter((contract: AnalysisResult) => {
    const matchesSearch = contract.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.documentType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'high-risk' && contract.riskLevel === 'High') ||
                         (filterStatus === 'medium-risk' && contract.riskLevel === 'Medium') ||
                         (filterStatus === 'low-risk' && contract.riskLevel === 'Low');
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  const handleDeleteContract = async (contractId: string) => {
    if (window.confirm('Are you sure you want to delete this contract analysis?')) {
      try {
        // Remove from Firestore
        const analysisRef = doc(db, 'analyses', contractId);
        await deleteDoc(analysisRef);
        
        // Update local state
        const updatedContracts = contracts.filter((c: AnalysisResult) => c.id !== contractId);
        setContracts(updatedContracts);
        
      } catch (error) {
        console.error('Error deleting contract:', error);
        alert('Failed to delete contract. Please try again.');
      }
    }
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-gray-50 overflow-hidden">
      <Header />
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-900/3 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gray-800/3 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gray-700/3 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
        {/* Welcome Section */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 text-shadow">
              Welcome back, 
              <span className="text-gray-700">{user?.name?.split(' ')[0] || 'User'}</span>
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              Your contract analysis dashboard
            </p>
            {user && (
              <div className="flex justify-center mt-4">
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-semibold border border-green-200">
                  Docs left: {docsLeft} / {user.maxContracts}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Contracts */}
            <div className="group bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalContracts}</p>
                  <p className="text-gray-600 font-medium text-sm">Total Contracts</p>
                </div>
              </div>
              <div className="flex items-center text-emerald-600">
                <TrendingUp className="h-4 w-4 mr-2" />
                <span className="text-sm font-semibold">All time</span>
              </div>
            </div>

            {/* High Risk */}
            <div className="group bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.highRisk}</p>
                  <p className="text-gray-600 font-medium text-sm">High Risk</p>
                </div>
              </div>
              <div className="flex items-center text-red-600">
                <Shield className="h-4 w-4 mr-2" />
                <span className="text-sm font-semibold">Needs attention</span>
              </div>
            </div>

            {/* Medium Risk */}
            <div className="group bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.mediumRisk}</p>
                  <p className="text-gray-600 font-medium text-sm">Medium Risk</p>
                </div>
              </div>
              <div className="flex items-center text-amber-600">
                <Clock className="h-4 w-4 mr-2" />
                <span className="text-sm font-semibold">Review suggested</span>
              </div>
            </div>

            {/* Low Risk */}
            <div className="group bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.lowRisk}</p>
                  <p className="text-gray-600 font-medium text-sm">Low Risk</p>
                </div>
              </div>
              <div className="flex items-center text-emerald-600">
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="text-sm font-semibold">Looking good</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Distribution and Quick Actions Side by Side */}
        <div className={`mb-8 transition-all duration-1000 delay-500 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution Chart */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Risk Distribution</h2>
                  <p className="text-gray-600 font-medium text-sm">Overview of your contract risk levels</p>
                </div>
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <div className="flex items-end justify-center space-x-6 h-48 mb-4">
                {/* High Risk Bar */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-12 bg-gradient-to-t from-red-500 to-red-400 rounded-t-lg shadow-lg transition-all duration-1000 hover:scale-105"
                    style={{ 
                      height: `${stats.totalContracts > 0 ? Math.max((stats.highRisk / stats.totalContracts) * 150, 15) : 15}px`,
                      animationDelay: '0.5s'
                    }}
                  ></div>
                  <div className="mt-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{stats.highRisk}</p>
                    <p className="text-xs text-gray-600 font-medium">High Risk</p>
                  </div>
                </div>

                {/* Medium Risk Bar */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-12 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg shadow-lg transition-all duration-1000 hover:scale-105"
                    style={{ 
                      height: `${stats.totalContracts > 0 ? Math.max((stats.mediumRisk / stats.totalContracts) * 150, 15) : 15}px`,
                      animationDelay: '0.7s'
                    }}
                  ></div>
                  <div className="mt-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{stats.mediumRisk}</p>
                    <p className="text-xs text-gray-600 font-medium">Medium Risk</p>
                  </div>
                </div>

                {/* Low Risk Bar */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-12 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg shadow-lg transition-all duration-1000 hover:scale-105"
                    style={{ 
                      height: `${stats.totalContracts > 0 ? Math.max((stats.lowRisk / stats.totalContracts) * 150, 15) : 15}px`,
                      animationDelay: '0.9s'
                    }}
                  ></div>
                  <div className="mt-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{stats.lowRisk}</p>
                    <p className="text-xs text-gray-600 font-medium">Low Risk</p>
                  </div>
                </div>
              </div>

              {/* Average Completion Score */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-gray-900 mb-1">Average Completion Score</p>
                    <p className="text-gray-600 text-sm">Overall contract completeness</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">{stats.avgCompletionScore}%</p>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-1000"
                        style={{ width: `${stats.avgCompletionScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col h-full justify-center">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to analyze more contracts?</h3>
                  <p className="text-gray-600 font-medium text-base">
                    You have <span className="font-bold text-gray-900 text-lg">{docsLeft}</span> free analyses remaining
                  </p>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => navigate('/analyzer')}
                    className="group bg-gray-900 text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition-all duration-300 font-bold text-lg flex items-center space-x-3 shadow-lg hover:shadow-xl hover:scale-105 shimmer-effect"
                  >
                    <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                    <span className="relative z-10">New Analysis</span>
                    <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contract History */}
        <div className={`mb-0 transition-all duration-1000 delay-900 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Contract History</h2>
                  <p className="text-gray-600 font-medium text-xs">Manage and review your analyzed contracts</p>
                </div>
                
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search contracts..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-medium bg-white shadow-sm hover:shadow-md transition-all duration-200 w-full sm:w-64"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value as any)}
                      className="pl-12 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-medium bg-white shadow-sm hover:shadow-md transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="all">All Risks</option>
                      <option value="high-risk">High Risk</option>
                      <option value="medium-risk">Medium Risk</option>
                      <option value="low-risk">Low Risk</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract List */}
            <div className="p-4">
              {filteredContracts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">No contracts found</h3>
                  <p className="text-gray-600 font-medium text-xs mb-4">
                    {contracts.length === 0 
                      ? "Start by analyzing your first contract" 
                      : "Try adjusting your search or filter criteria"
                    }
                  </p>
                  {contracts.length === 0 && (
                    <button
                      onClick={() => navigate('/analyzer')}
                      className="bg-gray-900 text-white px-4 py-1.5 rounded-md hover:bg-gray-800 transition-all duration-300 font-semibold text-xs"
                    >
                      Analyze First Contract
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredContracts.map((contract: AnalysisResult, index) => (
                    <div 
                      key={contract.id} 
                      className="group bg-gray-50 rounded-lg border border-gray-200 p-3 hover:shadow-md transition-all duration-300 card-hover"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <FileText className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-300">
                                {contract.fileName}
                              </h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(contract.analysisDate)}
                                </span>
                                <span className="font-medium">{contract.documentType}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                  <span>{Math.round(contract.completionScore * 100)}% Complete</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Risk Badge */}
                          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border ${getRiskBadgeColor(contract.riskLevel)}`}>
                            {contract.riskLevel} Risk
                          </span>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/results/${contract.id}`)}
                              className="group flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleDeleteContract(contract.id)}
                              className="group flex items-center justify-center w-10 h-10 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all duration-300 shadow-sm hover:shadow-md"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};export default Dashboard;

