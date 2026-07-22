import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  TrendingUp,
  Shield,
  DollarSign,
  Users,
  FileText
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AnalysisResult } from '@/lib/types';
import type { NegotiationSuggestion } from '@/lib/types';
import {
  generateNegotiationSuggestionsForAnalysis,
  getNegotiationState,
  listChatMessages,
  sendNegotiationChatMessage
} from '@/features/results/api/chatApi';
import { queryKeys } from '@/lib/queryKeys';
import { ApiClientError } from '@/lib/apiClient';

interface NegotiationSuggestionsProps {
  result: AnalysisResult;
  onClose: () => void;
}

type Suggestion = NegotiationSuggestion;

const NegotiationSuggestions = ({ result, onClose }: NegotiationSuggestionsProps) => {
  const queryClient = useQueryClient();
  const analysisId = result.id;
  const negotiationSessionId = `negotiation-${analysisId}`;

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedParty, setSelectedParty] = useState('');
  const [showPartySelection, setShowPartySelection] = useState(true);
  const [availableParties, setAvailableParties] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (result.parties && result.parties.length > 0) {
      setAvailableParties(result.parties);
    } else {
      setAvailableParties(getFallbackParties(result.documentType));
    }
  }, [result]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const [state, messages] = await Promise.all([
          getNegotiationState(analysisId),
          listChatMessages(analysisId, negotiationSessionId, 'negotiation').catch(() => [])
        ]);

        if (cancelled) return;

        if (state?.party) {
          setSelectedParty(state.party);
          setSuggestions((state.suggestions || []) as Suggestion[]);
          setShowPartySelection(false);
        }

        if (messages.length > 0) {
          setChatHistory(
            messages.map((message) => ({
              role: message.role,
              content: message.content
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load negotiation state', err);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [analysisId, negotiationSessionId]);

  const getFallbackParties = (documentType: string): string[] => {
    const lowerType = documentType?.toLowerCase() || '';

    if (lowerType.includes('lease') || lowerType.includes('rental')) {
      return ['Landlord', 'Tenant'];
    }
    if (lowerType.includes('employment')) {
      return ['Employer', 'Employee'];
    }
    if (lowerType.includes('nda') || lowerType.includes('confidentiality')) {
      return ['Disclosing Party', 'Receiving Party'];
    }
    if (lowerType.includes('service') || lowerType.includes('vendor')) {
      return ['Client', 'Vendor'];
    }
    if (lowerType.includes('purchase') || lowerType.includes('sale')) {
      return ['Buyer', 'Seller'];
    }
    return ['Party A', 'Party B'];
  };

  const handlePartySelection = async (party: string) => {
    setSelectedParty(party);
    setShowPartySelection(false);
    await generateSuggestions(party);
  };

  const generateSuggestions = async (party: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await generateNegotiationSuggestionsForAnalysis(analysisId, party);
      setSuggestions(response.suggestions);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.negotiation.state(analysisId)
      });
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Failed to generate negotiation suggestions. Please try again.'
      );
      console.error('Error generating suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const askAdvice = async (question: string) => {
    const newMessage = { role: 'user' as const, content: question };
    setChatHistory((prev) => [...prev, newMessage]);
    setChatLoading(true);

    try {
      const response = await sendNegotiationChatMessage(
        analysisId,
        question,
        selectedParty,
        negotiationSessionId
      );
      setChatHistory((prev) => [...prev, { role: 'assistant', content: response.response }]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            err instanceof ApiClientError
              ? err.message
              : 'Sorry, I encountered an error. Please try again.'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    const question = `Tell me more about this suggestion: "${suggestion.title}". ${suggestion.description}`;
    await askAdvice(question);
  };

  const sendMessage = async () => {
    if (!userMessage.trim() || !selectedParty) return;
    const question = userMessage.trim();
    setUserMessage('');
    await askAdvice(question);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'improvement':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'risk-mitigation':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'cost-optimization':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'clarity':
        return <Lightbulb className="h-4 w-4 text-amber-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatChatResponse = (text: string) => {
    let cleaned = text.replace(/\*+/g, '');
    cleaned = cleaned.replace(/^\*+\s*/gm, '• ');
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    return cleaned
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  };

  const getPartyIcon = (party: string) => {
    const lowerParty = party.toLowerCase();
    if (lowerParty.includes('landlord')) return <Users className="h-5 w-5 text-blue-600" />;
    if (lowerParty.includes('tenant')) return <Users className="h-5 w-5 text-green-600" />;
    if (lowerParty.includes('employer')) return <Users className="h-5 w-5 text-purple-600" />;
    if (lowerParty.includes('employee')) return <Users className="h-5 w-5 text-orange-600" />;
    if (lowerParty.includes('client')) return <Users className="h-5 w-5 text-indigo-600" />;
    if (lowerParty.includes('vendor')) return <Users className="h-5 w-5 text-teal-600" />;
    if (lowerParty.includes('buyer')) return <Users className="h-5 w-5 text-emerald-600" />;
    if (lowerParty.includes('seller')) return <Users className="h-5 w-5 text-rose-600" />;
    if (lowerParty.includes('disclosing')) return <FileText className="h-5 w-5 text-red-600" />;
    if (lowerParty.includes('receiving')) return <FileText className="h-5 w-5 text-violet-600" />;
    return <Users className="h-5 w-5 text-gray-600" />;
  };

  if (!hydrated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0 transition-opacity duration-300"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-7xl h-[90vh] flex flex-row items-stretch justify-center">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200 flex flex-1 flex-col w-full h-full animate-fade-in-glass overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Negotiation Suggestions</h2>
                <p className="text-sm text-gray-600">AI-powered recommendations for your contract</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {showPartySelection ? (
              <div className="w-full p-8 overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-6">
                      <Lightbulb className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">Select Your Role</h3>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                      Choose which party you represent to get personalized negotiation suggestions
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableParties.map((party, index) => (
                      <button
                        key={index}
                        onClick={() => void handlePartySelection(party)}
                        className="group p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-purple-300 hover:shadow-xl transition-all duration-300 text-center transform hover:scale-105"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="group-hover:scale-110 transition-transform duration-300">
                            {getPartyIcon(party)}
                          </div>
                          <h4 className="text-lg font-bold text-gray-900">{party}</h4>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => void handlePartySelection('Other')}
                      className="group p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-purple-300 hover:shadow-xl transition-all duration-300 text-center transform hover:scale-105 md:col-span-2 lg:col-span-3"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <span className="text-white font-bold text-sm">?</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">Other Party</h4>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="w-1/2 p-8 overflow-y-auto border-r border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                  <div className="space-y-8">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mb-4">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Generating Suggestions
                        </h3>
                        <p className="text-gray-600 text-center">
                          Creating personalized negotiation strategies for {selectedParty}...
                        </p>
                      </div>
                    ) : error ? (
                      <div className="flex items-center gap-4 p-6 bg-red-50 border border-red-200 rounded-2xl">
                        <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-red-800">Error</h3>
                          <p className="text-red-700">{error}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-4 mb-8">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <Users className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-purple-900">
                                Suggestions for {selectedParty}
                              </h3>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {suggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              onClick={() => void handleSuggestionClick(suggestion)}
                              className="w-full bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-purple-300 transition-all duration-300 transform hover:scale-[1.02] text-left group cursor-pointer"
                            >
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                  {getTypeIcon(suggestion.type)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-200">
                                      {suggestion.title}
                                    </h3>
                                    <span
                                      className={`inline-block px-4 py-2 rounded-full text-sm font-bold border-2 ${getPriorityColor(suggestion.priority)}`}
                                    >
                                      {suggestion.priority.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 mb-4 leading-relaxed text-base">
                                    {suggestion.description}
                                  </p>
                                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="text-green-800 font-semibold text-sm">
                                      {suggestion.impact}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-1/2 flex flex-col bg-white">
                  <div className="flex-1 p-8 overflow-y-auto">
                    <div className="space-y-4">
                      {chatHistory.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mx-auto mb-4">
                            <MessageSquare className="h-8 w-8 text-white" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Ask Specific Questions
                          </h3>
                          <p className="text-gray-600 mb-4">
                            Get personalized advice for {selectedParty} based on your contract
                          </p>
                        </div>
                      )}

                      {chatHistory.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                              message.role === 'user'
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {message.role === 'assistant' ? (
                              <div className="space-y-2">
                                {formatChatResponse(message.content).map((paragraph, pIndex) => (
                                  <p key={pIndex} className="text-sm leading-relaxed">
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            )}
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 text-gray-900 p-4 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-3">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm font-medium">Analyzing your question...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-8 border-t border-gray-200 bg-gray-50">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && void sendMessage()}
                        placeholder="Ask about negotiation strategies..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                        disabled={chatLoading}
                      />
                      <button
                        onClick={() => void sendMessage()}
                        disabled={!userMessage.trim() || chatLoading}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        <span className="font-medium">Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="absolute -right-6 -top-6 z-20">
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-900 font-bold rounded-full p-2 focus:outline-none transition-colors duration-200"
            title="Close suggestions"
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
  );
};

export default NegotiationSuggestions;
