import { useEffect, useState } from 'react';
import FileUpload from '@/features/analyze/components/FileUpload';
import {
  Zap,
  Shield,
  CheckCircle,
  Users,
  Sparkles,
  FileText,
  Star
} from 'lucide-react';

export interface AnalyzerViewProps {
  userPlan?: string;
  remainingAnalyses: number;
  maxContracts: number;
  uploadedFile: File | null;
  isAnalyzing: boolean;
  error: string | null;
  onFileUpload: (file: File) => void;
  onRemoveFile: () => void;
}

const useContinuousTyping = (
  text: string,
  speed: number = 80,
  pauseDuration: number = 2000,
  startDelay: number = 0
) => {
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
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }

    if (isTyping && currentIndex >= text.length) {
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (!isTyping && displayText.length > 0) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev.slice(0, -1));
      }, speed / 2);
      return () => clearTimeout(timeout);
    }

    if (!isTyping && displayText.length === 0) {
      setCurrentIndex(0);
      setIsTyping(true);
    }
  }, [
    currentIndex,
    displayText,
    isTyping,
    text,
    speed,
    pauseDuration,
    hasStarted,
    startDelay
  ]);

  return { displayText, isTyping };
};

const features = [
  {
    icon: Zap,
    title: 'AI-Powered Analysis',
    color: 'from-amber-400 to-orange-500'
  },
  {
    icon: Shield,
    title: 'Risk Assessment',
    color: 'from-emerald-400 to-green-500'
  },
  {
    icon: CheckCircle,
    title: 'Completeness Check',
    color: 'from-blue-400 to-cyan-500'
  },
  {
    icon: Users,
    title: 'Plain English Summary',
    color: 'from-violet-400 to-purple-500'
  }
];

export function AnalyzerView({
  userPlan,
  remainingAnalyses,
  maxContracts,
  uploadedFile,
  isAnalyzing,
  error,
  onFileUpload,
  onRemoveFile
}: AnalyzerViewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const headingAnimation = useContinuousTyping('Upload Your Legal Contract', 80, 2000);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-900/5 rounded-full blur-3xl animate-float" />
        <div
          className="absolute top-3/4 right-1/4 w-80 h-80 bg-gray-800/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-gray-700/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '4s' }}
        />
      </div>

      <section className="relative pt-28 pb-6 px-2 sm:px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center relative z-10">
            <div
              className={`inline-flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-semibold mb-4 shadow-lg transition-all duration-1000 ${
                isVisible ? 'animate-slide-up' : 'opacity-0'
              }`}
            >
              <Star className="h-5 w-5 text-amber-400 animate-pulse" />
              <span>AI-Powered Contract Analysis</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>

            <div
              className={`transition-all duration-1000 delay-300 ${
                isVisible ? 'animate-slide-up' : 'opacity-0'
              }`}
            >
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-2 leading-tight text-shadow">
                <span className="block">
                  {headingAnimation.displayText}
                  {headingAnimation.isTyping && <span className="animate-pulse">|</span>}
                </span>
              </h1>
            </div>

            <div
              className={`transition-all duration-1000 delay-500 ${
                isVisible ? 'animate-slide-up' : 'opacity-0'
              }`}
            >
              <p className="text-base md:text-lg text-gray-600 mb-4 max-w-3xl mx-auto leading-relaxed font-medium">
                Get instant AI-powered analysis, risk assessment, and plain English summaries in
                seconds.
              </p>
            </div>

            <div
              className={`max-w-7xl mx-auto transition-all duration-1000 delay-700 ${
                isVisible ? 'animate-slide-up' : 'opacity-0'
              }`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-3">
                  {userPlan && (
                    <div className="flex flex-wrap justify-center gap-3 mb-4">
                      <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold border border-blue-200">
                        Plan: {userPlan === 'free' ? 'Free Tier' : userPlan}
                      </div>
                      <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-semibold border border-green-200">
                        Analyses Left: {remainingAnalyses} / {maxContracts}
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <FileUpload
                      onFileUpload={onFileUpload}
                      uploadedFile={uploadedFile}
                      onRemoveFile={onRemoveFile}
                      isAnalyzing={isAnalyzing}
                    />
                  </div>

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

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Supported formats: PDF, DOC, DOCX, TXT
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Your document is processed securely and never stored permanently
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-3 pt-10">
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                      Why Choose <span className="text-gray-700"> Clario?</span>
                    </h2>
                    <p className="text-gray-600 text-base font-medium">
                      Powerful features designed to make contract analysis fast, accurate, and
                      accessible.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {features.map((feature) => (
                      <div
                        key={feature.title}
                        className="group bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-all duration-300 hover:scale-105"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div
                              className={`w-10 h-10 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300`}
                            >
                              <feature.icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="absolute inset-0 bg-gray-900/10 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-700 transition-colors duration-300">
                            {feature.title}
                          </h3>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-3 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold mb-2">Ready to get started?</h3>
                        <p className="text-gray-300 text-sm">
                          Upload your first contract and experience the power of AI analysis
                        </p>
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
}
