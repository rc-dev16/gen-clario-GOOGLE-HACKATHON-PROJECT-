/**
 * Document Chat Component
 * 
 * Interactive chat interface for document analysis that provides:
 * - Real-time AI responses using Gemini API
 * - Context-aware document analysis
 * - Chat history management
 * - Session persistence
 * - Multi-session support
 * 
 * Features:
 * - Maintains chat history per document
 * - Handles multiple chat sessions
 * - Provides document context to AI
 * - Formats AI responses for readability
 * - Auto-scrolling chat interface
 */

import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FiSend } from 'react-icons/fi';
import { Scale } from 'lucide-react';
import axios from 'axios';

import { AnalysisResult } from '../../types';

interface DocumentChatProps {
  result: AnalysisResult;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface ChatSession {
  key: string;
  sessionId: string;
  lastTime: number;
  preview: string;
}

function formatGeminiResponse(text: string): string {
  // Remove code block markers
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\n?/, '').replace(/```$/, '');
  }
  // Try to parse JSON and pretty print as plain text
  try {
    const obj = JSON.parse(text);
      if (Array.isArray(obj) && obj.length > 0) {
        // If array of objects, extract all string values from all keys
        return obj.map((item: Record<string, unknown>) => {
        if (typeof item === 'object' && item !== null) {
          // If only one key, just show the value
          const keys = Object.keys(item);
          if (keys.length === 1) {
            return item[keys[0]];
          }
          // Otherwise, show all key-value pairs
          return Object.entries(item)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        }
        return typeof item === 'string' ? item : JSON.stringify(item);
      }).join('\n\n');
    }
    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);
      if (keys.length === 1) {
        return obj[keys[0]];
      }
      return Object.entries(obj)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
  } catch {
    // Not JSON, return as-is
  }
  // Replace any line starting with one or more asterisks (optionally with spaces) with a bullet
  text = text.replace(/^\*+\s*/gm, '• ');
  // Remove any remaining asterisks used for bold/emphasis
  text = text.replace(/\*+/g, '');
  return text;
}

const DocumentChat: React.FC<DocumentChatProps> = ({ result }) => {
  const docId = result.id;

  // Prevent background scroll when dialog is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // --- Chat Session Management ---
  const getSessionKeys = () => {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(`chat-history-${docId}-`));
  };
  const getSessions = (): ChatSession[] => {
    return getSessionKeys()
      .map((k: string) => {
        const messages = JSON.parse(localStorage.getItem(k) || '[]') as ChatMessage[];
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        
        // Format the preview text
        let preview = 'No messages';
        if (lastMsg) {
          // Get the first user message as preview
          const firstUserMsg = messages.find((m: ChatMessage) => m.sender === 'user');
          if (firstUserMsg) {
            preview = firstUserMsg.text
              .replace(/[{}\[\]"]/g, '') // Remove JSON syntax
              .trim()
              .slice(0, 40);             // Limit length
          } else {
            preview = 'New chat session';
          }
        }
        
        return {
          key: k,
          sessionId: k.replace(`chat-history-${docId}-`, ''),
          lastTime: lastMsg ? lastMsg.timestamp : 0,
          preview: preview + (preview.length >= 40 ? '...' : ''),
        };
      })
      .sort((a, b) => b.lastTime - a.lastTime);
  };
  const [sessionId, setSessionId] = useState(() => {
    const sessions = getSessions();
    if (sessions.length > 0) return sessions[0].sessionId;
    return uuidv4();
  });
  const getStorageKey = (sid = sessionId) => `chat-history-${docId}-${sid}`;

  const normalizeMessages = (msgs: any[]): ChatMessage[] =>
    msgs.map(m => ({ ...m, sender: m.sender === 'user' ? 'user' : 'ai' }));
  const getInitialMessages = () => {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
      try {
        return normalizeMessages(JSON.parse(saved));
      } catch {}
    }
    return [{
      sender: 'ai' as const,
      text: "Hi! I'm your contract assistant. Ask me anything about this document, such as payment terms, parties, risks, or any specific clause.",
      timestamp: Date.now(),
    }];
  };
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages());
  useEffect(() => {
    setMessages(getInitialMessages());
  }, [sessionId]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Gemini API call logic
  const askGeminiAPI = async (prompt: string): Promise<string> => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Gemini API key not configured');
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      const data = response.data;
      let completionText = '';
      if (Array.isArray(data.candidates) && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate?.content?.parts?.[0]?.text) {
          completionText = candidate.content.parts[0].text;
        }
      } else if (Array.isArray(data.choices) && data.choices.length > 0) {
        const choice = data.choices[0];
        if (choice?.message?.content) {
          completionText = choice.message.content;
        }
      } else if (typeof data.text === 'string') {
        completionText = data.text;
      } else if (typeof data === 'string') {
        completionText = data;
      }
      if (!completionText) throw new Error('No response from Gemini');
      let finalText = completionText;
      try {
        const parsed = JSON.parse(completionText);
        if (parsed && typeof parsed.response === 'string') {
          finalText = parsed.response;
        }
      } catch {}
      return finalText;
    } catch (e: any) {
      console.error('Gemini API error:', e);
      throw new Error(e?.message || 'Failed to get response from Gemini API');
    }
  };

  // Use Gemini for AI response
  const sendMessage = async (question: string) => {
    setLoading(true);
    setError(null);
    setMessages((prev) => {
      const updated = [...prev, { sender: 'user' as const, text: question, timestamp: Date.now() }];
      localStorage.setItem(getStorageKey(), JSON.stringify(updated));
      return updated;
    });
    setTyping(true);
    try {
      const prompt = `You are Clario, a friendly and expert contract assistant. Use the contract context below to answer the user's question.\n\n- If the question is about the contract, answer in detail using the context.\n- If the question is not about the contract, respond conversationally and offer to help with contract questions.\n- If the question is a greeting, greet the user and offer to help.\n- If the question is unclear, politely ask for clarification.\n- Always be concise, helpful, and approachable.\n- If the user's question contains typos, misspellings, or grammatical errors, do your best to understand and answer correctly.\n- Always answer in plain English, never in JSON, code, or structured data format.\n- If your answer contains a list or multiple items, use bullet points whenever possible.\n\nContract Context:\nDocument: ${result.fileName}\nType: ${result.contractType || result.documentType}\nSummary: ${result.overallSummary || ''}\nKey Terms: ${(result.keyTerms || []).join(', ')}\nPayment Terms: ${result.paymentTerms || ''}\nImportant Dates: ${JSON.stringify(result.importantDates || {})}\n\nUser: ${question}`;
      const aiResponse = await askGeminiAPI(prompt);
      setTyping(false);
      setMessages((prev) => {
        const updated = [...prev, { sender: 'ai' as const, text: aiResponse, timestamp: Date.now() }];
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      setTyping(false);
      setError('Failed to get response from Gemini.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    await sendMessage(input.trim());
    setInput('');
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typing]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleNewChat = () => {
    const newId = uuidv4();
    const now = new Date();
    const sessionName = `Chat Session`;
    
    // Save session name
    localStorage.setItem(`chat-name-${docId}-${newId}`, sessionName);
    
    setSessionId(newId);
    setMessages([{
      sender: 'ai',
      text: "Hi! I'm your contract assistant. Ask me anything about this document, such as payment terms, parties, risks, or any specific clause.",
      timestamp: now.getTime(),
    }]);
  };
  
  const getSessionName = (sid: string) => {
    return localStorage.getItem(`chat-name-${docId}-${sid}`) || 'Chat Session';
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center  z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-full flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="relative">
                  <span className="absolute inset-0 rounded-2xl bg-black opacity-40 blur-xl"></span>
                  <span className="relative p-2 bg-gray-900 rounded-2xl flex items-center justify-center">
                    <Scale className="h-6 w-6 text-white" />
                  </span>
                </span>
                <h1 className="text-base font-semibold text-gray-900">AI Chat</h1>
              </div>
            </div>
            <button
              onClick={handleNewChat}
              className="w-full bg-black hover:bg-gray-800 text-white rounded-lg py-2 px-3 flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <span className="text-base font-bold">+</span>
              New Chat
            </button>
          </div>
          {/* Chat History */}
          <div className="flex-1 min-h-0 overflow-y-scroll custom-scrollbar p-4">
            <h2 className="text-xs font-medium text-gray-600 mb-3">Chat History</h2>
            {getSessions().length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No previous chats</p>
            ) : (
              <div className="space-y-2">
                {getSessions().map((s) => (
                  <button
                    key={s.sessionId}
                    onClick={() => setSessionId(s.sessionId)}
                    className={`w-full text-left p-2 rounded-lg transition-colors mb-1 border border-transparent text-xs ${s.sessionId === sessionId ? 'bg-gray-900 text-white font-bold border-gray-900' : 'bg-white text-gray-800 hover:bg-gray-100'}`}
                  >
                    <div className="font-medium mb-1">{getSessionName(s.sessionId)}</div>
                    <div className="truncate text-[10px] opacity-75">{s.preview}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{s.lastTime ? new Date(s.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-full">
          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-scroll p-4 custom-scrollbar">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-gray-400 text-xs text-center mt-10">Ask any question about this document...</div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}> 
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${msg.sender === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'} text-sm`}> 
                    <span className="text-xs leading-relaxed whitespace-pre-line break-words block">{msg.sender === 'ai' ? formatGeminiResponse(msg.text) : msg.text}</span>
                    <span className={`text-[10px] mt-2 block text-right ${msg.sender === 'user' ? 'text-gray-300' : 'text-gray-500'}`}>{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-3 py-2 bg-gray-100 text-gray-900 flex items-center gap-2 text-sm">
                    <span className="animate-pulse text-xs">AI is typing...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
          {/* Error */}
          {error && <div className="text-red-500 text-xs px-6 pt-2 pb-1">{error}</div>}
          {/* Input Area */}
          <div className="border-t border-gray-200 p-3">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 rounded-full border border-gray-300 focus:border-black focus:ring-black py-2 px-3 text-xs outline-none transition-all"
                disabled={loading}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !loading) {
                      (e.target as HTMLInputElement).blur();
                      (e.target as HTMLInputElement).form?.requestSubmit();
                    }
                  }
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-black hover:bg-gray-800 text-white rounded-full px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xs"
                aria-label="Send"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
      {/* Custom Scrollbar & Animations */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 8px; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #e5e7eb #f9fafb; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  );
};

export default DocumentChat;