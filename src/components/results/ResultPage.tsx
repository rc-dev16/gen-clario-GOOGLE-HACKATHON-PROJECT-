import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { AnalysisResult } from '../../types';
import { AnalysisResults } from './ResultDetails';
import DocumentChat from './DocumentChat';
import NegotiationSuggestions from '../NegotiationSuggestions';
import Header2 from '../header2';

const db = getFirestore();

const AnalysisResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showChat, setShowChat] = useState(false); // Move chat modal state here
  const [showNegotiationSuggestions, setShowNegotiationSuggestions] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    setLoading(true);
    setError(null);
    const fetchContract = async () => {
      try {
        const docRef = doc(db, 'analyses', id!);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setResult(docSnap.data() as AnalysisResult);
        } else {
          setError('Analysis result not found.');
        }
      } catch (e) {
        console.error('Error fetching contract:', e);
        setError('Failed to load analysis result.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContract();
  }, [id]);

  useEffect(() => {
    if (showChat) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    // Listen for sidebar close event
    const closeHandler = () => setShowChat(false);
    window.addEventListener('close-chat-modal', closeHandler);
    return () => {
      document.body.classList.remove('overflow-hidden');
      window.removeEventListener('close-chat-modal', closeHandler);
    };
  }, [showChat]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden relative">
      <Header2 />
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-900/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gray-800/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gray-700/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className={`transition-all duration-1000 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
          {loading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading analysis results...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-8 rounded-2xl text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-bold text-xl">!</span>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Error Loading Results</h3>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}
          
          {result && (
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
      {/* Chat Modal rendered at top level so overlay covers full page */}
      {showChat && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0 transition-opacity duration-300" onClick={() => setShowChat(false)} />
          <div className="relative z-10 w-full max-w-7xl h-[90vh] flex flex-row items-stretch justify-center">
            {/* Chat Modal Content */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200 flex flex-1 flex-col w-full h-full animate-fade-in-glass overflow-hidden">
              <div className="flex-1 flex flex-col">
                <DocumentChat result={result} />
              </div>
            </div>
            {/* Close Button Section: top right, outside modal, floating, no background */}
            <div className="absolute -right-6 -top-6 z-20">
              <button onClick={() => setShowChat(false)} className="text-2xl text-gray-400 hover:text-gray-900 font-bold rounded-full p-2 focus:outline-none" title="Close chat">&times;</button>
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

      {/* Negotiation Suggestions Modal */}
      {showNegotiationSuggestions && result && (
        <NegotiationSuggestions 
          result={result} 
          onClose={() => setShowNegotiationSuggestions(false)}
          documentText={result.documentText}
        />
      )}
    </div>
  );
};

export default AnalysisResultPage; 