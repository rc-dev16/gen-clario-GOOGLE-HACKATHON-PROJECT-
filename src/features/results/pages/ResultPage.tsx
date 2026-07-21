import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnalysisResults } from '@/features/results/components/ResultDetails';
import DocumentChat from '@/features/results/components/DocumentChat';
import NegotiationSuggestions from '@/features/results/components/NegotiationSuggestions';
import { useAnalysis } from '@/features/results/hooks/useAnalysis';
import { LoadingState } from '@/shared/ui/LoadingState';
import { ErrorState } from '@/shared/ui/ErrorState';

const ResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: result, isLoading, error: queryError } = useAnalysis(id);
  const [isVisible, setIsVisible] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showNegotiationSuggestions, setShowNegotiationSuggestions] = useState(false);

  const errorMessage =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? 'Failed to load analysis result.'
        : null;

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (showChat) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    const closeHandler = () => setShowChat(false);
    window.addEventListener('close-chat-modal', closeHandler);
    return () => {
      document.body.classList.remove('overflow-hidden');
      window.removeEventListener('close-chat-modal', closeHandler);
    };
  }, [showChat]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden relative">
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

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? 'animate-slide-up' : 'opacity-0'
          }`}
        >
          {isLoading && <LoadingState message="Loading analysis results..." />}
          {errorMessage && (
            <ErrorState title="Error Loading Results" message={errorMessage} />
          )}
          {result && (result.status === 'pending' || result.status === 'processing') && (
            <LoadingState
              message={
                result.status === 'pending'
                  ? 'Your analysis is queued…'
                  : 'Your analysis is processing…'
              }
            />
          )}
          {result && result.status === 'failed' && (
            <ErrorState
              title="Analysis Failed"
              message={result.error || 'The analysis job failed. Please try uploading again.'}
            />
          )}
          {result && (!result.status || result.status === 'ready' || result.status === 'completed') && (
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden mt-8">
              <AnalysisResults
                result={result}
                setShowChat={setShowChat}
                setShowNegotiationSuggestions={setShowNegotiationSuggestions}
              />
            </div>
          )}
        </div>
      </main>

      {showChat && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0 transition-opacity duration-300"
            onClick={() => setShowChat(false)}
          />
          <div className="relative z-10 w-full max-w-7xl h-[90vh] flex flex-row items-stretch justify-center">
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200 flex flex-1 flex-col w-full h-full animate-fade-in-glass overflow-hidden">
              <div className="flex-1 flex flex-col">
                <DocumentChat result={result} />
              </div>
            </div>
            <div className="absolute -right-6 -top-6 z-20">
              <button
                onClick={() => setShowChat(false)}
                className="text-2xl text-gray-400 hover:text-gray-900 font-bold rounded-full p-2 focus:outline-none"
                title="Close chat"
              >
                &times;
              </button>
            </div>
            <style>{`
              @keyframes fade-in-glass {
                0% { opacity: 0; filter: blur(12px); transform: scale(0.98); }
                100% { opacity: 1; filter: blur(0); transform: scale(1); }
              }
              .animate-fade-in-glass { animation: fade-in-glass 0.3s cubic-bezier(0.4,0,0.2,1) forwards; }
            `}</style>
          </div>
        </div>
      )}

      {showNegotiationSuggestions && result && (
        <NegotiationSuggestions
          result={result}
          onClose={() => setShowNegotiationSuggestions(false)}
        />
      )}
    </div>
  );
};

export default ResultPage;
