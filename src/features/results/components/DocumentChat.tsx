/**
 * Document Chat — server-backed sessions by analysisId (no client prompts / localStorage).
 */

import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FiSend } from 'react-icons/fi';
import { Scale } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AnalysisResult } from '@/lib/types';
import {
  listChatMessages,
  listChatSessions,
  sendDocumentChatMessage,
  type ServerChatMessage
} from '@/features/results/api/chatApi';
import { queryKeys } from '@/lib/queryKeys';
import { ApiClientError } from '@/lib/apiClient';

interface DocumentChatProps {
  result: AnalysisResult;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

const WELCOME: ChatMessage = {
  sender: 'ai',
  text: "Hi! I'm your contract assistant. Ask me anything about this document, such as payment terms, parties, risks, or any specific clause.",
  timestamp: Date.now()
};

function formatGeminiResponse(text: string): string {
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\n?/, '').replace(/```$/, '');
  }
  try {
    const obj = JSON.parse(text);
    if (Array.isArray(obj) && obj.length > 0) {
      return obj
        .map((item: Record<string, unknown>) => {
          if (typeof item === 'object' && item !== null) {
            const keys = Object.keys(item);
            if (keys.length === 1) {
              return String(item[keys[0]]);
            }
            return Object.entries(item)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n');
          }
          return typeof item === 'string' ? item : JSON.stringify(item);
        })
        .join('\n\n');
    }
    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);
      if (keys.length === 1) {
        return String(obj[keys[0]]);
      }
      return Object.entries(obj)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
  } catch {
    // not JSON
  }
  text = text.replace(/^\*+\s*/gm, '• ');
  text = text.replace(/\*+/g, '');
  return text;
}

function toUiMessages(messages: ServerChatMessage[]): ChatMessage[] {
  if (messages.length === 0) {
    return [{ ...WELCOME, timestamp: Date.now() }];
  }
  return messages.map((message) => ({
    sender: message.role === 'user' ? 'user' : 'ai',
    text: message.content,
    timestamp: message.timestamp
  }));
}

const DocumentChat: React.FC<DocumentChatProps> = ({ result }) => {
  const analysisId = result.id;
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<ChatMessage[]>([{ ...WELCOME }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.chat.sessions(analysisId, 'document'),
    queryFn: () => listChatSessions(analysisId, 'document')
  });

  useEffect(() => {
    if (bootstrapped.current || !sessionsQuery.data) {
      return;
    }
    bootstrapped.current = true;
    if (sessionsQuery.data.length > 0) {
      setSessionId(sessionsQuery.data[0].sessionId);
    }
  }, [sessionsQuery.data]);

  const messagesQuery = useQuery({
    queryKey: queryKeys.chat.messages(analysisId, sessionId, 'document'),
    queryFn: () => listChatMessages(analysisId, sessionId, 'document'),
    enabled: Boolean(sessionId)
  });

  useEffect(() => {
    if (messagesQuery.data) {
      setMessages(toUiMessages(messagesQuery.data));
    }
  }, [messagesQuery.data, sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = async (question: string) => {
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { sender: 'user', text: question, timestamp: Date.now() }]);
    setTyping(true);

    try {
      const resultPayload = await sendDocumentChatMessage(analysisId, question, sessionId);
      if (resultPayload.sessionId !== sessionId) {
        setSessionId(resultPayload.sessionId);
      }
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: resultPayload.response, timestamp: Date.now() }
      ]);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.sessions(analysisId, 'document')
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(analysisId, resultPayload.sessionId, 'document')
      });
    } catch (e) {
      setTyping(false);
      setError(
        e instanceof ApiClientError ? e.message : 'Failed to get response from Clario AI.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    await sendMessage(question);
  };

  const handleNewChat = () => {
    const newId = uuidv4();
    setSessionId(newId);
    setMessages([{ ...WELCOME, timestamp: Date.now() }]);
    setError(null);
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sessions = sessionsQuery.data || [];

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center  z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-full flex overflow-hidden">
        <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
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
          <div className="flex-1 min-h-0 overflow-y-scroll custom-scrollbar p-4">
            <h2 className="text-xs font-medium text-gray-600 mb-3">Chat History</h2>
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No previous chats</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <button
                    key={s.sessionId}
                    onClick={() => setSessionId(s.sessionId)}
                    className={`w-full text-left p-2 rounded-lg transition-colors mb-1 border border-transparent text-xs ${s.sessionId === sessionId ? 'bg-gray-900 text-white font-bold border-gray-900' : 'bg-white text-gray-800 hover:bg-gray-100'}`}
                  >
                    <div className="font-medium mb-1">{s.name || 'Chat Session'}</div>
                    <div className="truncate text-[10px] opacity-75">{s.preview}</div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {s.lastTime
                        ? new Date(s.lastTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col h-full">
          <div className="flex-1 min-h-0 overflow-y-scroll p-4 custom-scrollbar">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${msg.sender === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'} text-sm`}
                  >
                    <span className="text-xs leading-relaxed whitespace-pre-line break-words block">
                      {msg.sender === 'ai' ? formatGeminiResponse(msg.text) : msg.text}
                    </span>
                    <span
                      className={`text-[10px] mt-2 block text-right ${msg.sender === 'user' ? 'text-gray-300' : 'text-gray-500'}`}
                    >
                      {formatTime(msg.timestamp)}
                    </span>
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
          {error && <div className="text-red-500 text-xs px-6 pt-2 pb-1">{error}</div>}
          <div className="border-t border-gray-200 p-3">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 rounded-full border border-gray-300 focus:border-black focus:ring-black py-2 px-3 text-xs outline-none transition-all"
                disabled={loading}
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
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 8px; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #e5e7eb #f9fafb; }
      `}</style>
    </div>
  );
};

export default DocumentChat;
