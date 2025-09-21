/**
 * Document Analyzer Component
 * 
 * Handles document upload and analysis with features:
 * - Secure file upload with format validation
 * - AI-powered document analysis
 * - Real-time analysis progress tracking
 * - Plan-based upload limitations
 * - Interactive UI with animations
 * 
 * Supports:
 * - PDF, DOC, DOCX, TXT formats
 * - Size limit: 10MB
 * - Free/Enterprise plan handling
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from './FileUpload';
import { analyzeDocument, incrementContractsAnalyzed, getContractsAnalyzed } from '../services/analysisService';
import { useNavigate } from 'react-router-dom';
import Header from './header2';
import { 
  Zap, 
  Shield, 
  CheckCircle, 
  Users, 
  Sparkles, 
  FileText, 
  Star
} from 'lucide-react';

// Continuous Typing Animation Hook
const useContinuousTyping = (text: string, speed: number = 80, pauseDuration: number = 2000, startDelay: number = 0) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(startDelay === 0);

  useEffect(() => {
    if (!hasStarted && startDelay > 0) {
      const startTimeout = setTimeout(() => {
        setHasStarted(true);
        setIsTyping(true);
      }, startDelay);
      return () => clearTimeout(startTimeout);
    }

    if (!hasStarted) return;

    if (isTyping && currentIndex < text.length) {
      // Typing phase
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (isTyping && currentIndex >= text.length) {
      // Pause after typing complete
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, pauseDuration);
      return () => clearTimeout(timeout);
    } else if (!isTyping && displayText.length > 0) {
      // Erasing phase
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev.slice(0, -1));
      }, speed / 2);
      return () => clearTimeout(timeout);
    } else if (!isTyping && displayText.length === 0) {
      // Reset and start typing again
      setCurrentIndex(0);
      setIsTyping(true);
    }
  }, [currentIndex, displayText, isTyping, text, speed, pauseDuration, hasStarted, startDelay]);

  return { displayText, isTyping };
};

const Analyzer: React.FC = () => {
  const { user } = useAuth();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const [contractsAnalyzed, setContractsAnalyzed] = useState<number>(0);

  // Continuous typing animation for the main heading
  const headingAnimation = useContinuousTyping("Upload Your Legal Contract", 80, 2000);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Fetch contractsAnalyzed from Firestore on mount and when user changes
  useEffect(() => {
    // Redirect to home if not logged in
    if (!user) {
      navigate('/');
      return;
    }

    const fetchCount = async () => {
      // Clear localStorage when a new user logs in
      localStorage.removeItem('contracts');
      try {
        const count = await getContractsAnalyzed(user.id);
        setContractsAnalyzed(count);
        
        // Update the user's maxContracts in context if needed
        if (user.maxContracts !== 5) {
          user.maxContracts = 5;
        }
      } catch (error) {
        console.error('Error fetching contract count:', error);
        setContractsAnalyzed(0);
      }
    };
    fetchCount();
  }, [user]);

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    // ENFORCE FREE PLAN LIMIT BASED ON FIRESTORE CONTRACT COUNT
    if (user.plan === 'free') {
      const count = await getContractsAnalyzed(user.id);
      if (count >= user.maxContracts) {
        setError('You have reached the maximum number of uploads for the free plan.');
        return;
      }
    }

    setUploadedFile(file);
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeDocument(file, user.id);
      // Save to localStorage and update user stats
      const existingContracts = JSON.parse(localStorage.getItem('contracts') || '[]');
      const updatedContracts = [result, ...existingContracts];
      localStorage.setItem('contracts', JSON.stringify(updatedContracts));
      // Update contract count in Firestore
      await incrementContractsAnalyzed(user.id);
      // Refresh contract count in UI
      const newCount = await getContractsAnalyzed(user.id);
      setContractsAnalyzed(newCount);
      // Redirect to result page
      navigate(`/results/${result.id}`);
    } catch (error) {
      console.error('Analysis failed:', error);
      setError('Analysis failed. Please try again or contact support.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setIsAnalyzing(false);
    setError(null);
  };

  const remainingAnalyses = user ? Math.max(0, user.maxContracts - contractsAnalyzed) : 0;

  const features = [
    {
      icon: Zap,
      title: "AI-Powered Analysis",
      description: "Advanced Gemini AI analyzes your contracts in seconds, not hours",
      color: "from-amber-400 to-orange-500"
    },
    {
      icon: Shield,
      title: "Risk Assessment",
      description: "Identify potential risks and missing clauses before signing",
      color: "from-emerald-400 to-green-500"
    },
    {
      icon: CheckCircle,
      title: "Completeness Check",
      description: "Ensure all essential fields are properly filled and documented",
      color: "from-blue-400 to-cyan-500"
    },
    {
      icon: Users,
      title: "Plain English Summary",
      description: "Complex legal jargon translated into easy-to-understand language",
      color: "from-violet-400 to-purple-500"
    }
  ];

  // Stats are now handled in a separate component

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      <Header />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-900/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gray-800/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gray-700/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-6 px-2 sm:px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center relative z-10">
            {/* Badge */}
            <div className={`inline-flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-semibold mb-4 shadow-lg transition-all duration-1000 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              <Star className="h-5 w-5 text-amber-400 animate-pulse" />
              <span>AI-Powered Contract Analysis</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>

            {/* Main Heading */}
            <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-2 leading-tight text-shadow">
                <span className="block">
                  {headingAnimation.displayText}
                  {headingAnimation.isTyping && <span className="animate-pulse">|</span>}
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              <p className="text-base md:text-lg text-gray-600 mb-4 max-w-3xl mx-auto leading-relaxed font-medium">
                Get instant AI-powered analysis, risk assessment, and plain English summaries in seconds.
              </p>
            </div>

            {/* Upload and Features Side by Side */}
            <div className={`max-w-7xl mx-auto transition-all duration-1000 delay-700 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Upload Section */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-3">
                  {/* User Status */}
                  {user && (
                    <div className="flex flex-wrap justify-center gap-3 mb-4">
                      <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold border border-blue-200">
                        Plan: {user.plan === 'free' ? 'Free Tier' : user.plan}
                      </div>
                      <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-semibold border border-green-200">
                        Analyses Left: {remainingAnalyses} / {user.maxContracts}
                      </div>
                    </div>
                  )}

                  {/* Upload Area */}
                  <div className="mb-4">
                    <FileUpload
                      onFileUpload={handleFileUpload}
                      uploadedFile={uploadedFile}
                      onRemoveFile={handleRemoveFile}
                      isAnalyzing={isAnalyzing}
                    />
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 font-bold text-sm">!</span>
                        </div>
                        <span className="font-medium">{error}</span>
                      </div>
                    </div>
                  )}

                  {/* Upload Instructions */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm font-medium">Supported formats: PDF, DOC, DOCX, TXT</span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Your document is processed securely and never stored permanently
                    </p>
                  </div>
                </div>

                                  {/* Features Section */}
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-3 pt-10">
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                      Why Choose 
                      <span className="text-gray-700"> Clario?</span>
                    </h2>
                    <p className="text-gray-600 text-base font-medium">
                      Powerful features designed to make contract analysis fast, accurate, and accessible.
                    </p>
                  </div>
                                     <div className="grid grid-cols-2 gap-2 mb-4">
                     {features.map((feature, index) => (
                       <div key={index} className="group bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-all duration-300 hover:scale-105">
                         <div className="flex items-center gap-3">
                           <div className="relative">
                             <div className={`w-10 h-10 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300`}>
                               <feature.icon className="h-5 w-5 text-white" />
                             </div>
                             <div className="absolute inset-0 bg-gray-900/10 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                           </div>
                           <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-700 transition-colors duration-300">
                             {feature.title}
                           </h3>
                         </div>
                       </div>
                     ))}
                   </div>

                   {/* Additional Info */}
                   <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-3 text-white">
                     <div className="flex items-center justify-between">
                       <div>
                         <h3 className="text-lg font-bold mb-2">Ready to get started?</h3>
                         <p className="text-gray-300 text-sm">Upload your first contract and experience the power of AI analysis</p>
                       </div>
                       <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                         <Sparkles className="h-6 w-6 text-amber-400" />
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </section>
    </div>
  );
};

export default Analyzer;