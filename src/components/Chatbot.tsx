import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, ChatSession, ChatMessage } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Send, Plus, MessageSquare, Loader2, Trash2, Menu } from 'lucide-react';

interface ChatbotProps {
  onClose: () => void;
}

export default function Chatbot({ onClose }: ChatbotProps) {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('student_id', profile?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
      if (!currentSession && data && data.length > 0) {
        setCurrentSession(data[0]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }, [profile?.id, currentSession]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id);
    }
  }, [currentSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          student_id: profile?.id,
          title: 'New Chat',
        })
        .select()
        .single();

      if (error) throw error;
      setSessions([data, ...sessions]);
      setCurrentSession(data);
      setMessages([]);
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);

      if (currentSession?.id === sessionId) {
        setCurrentSession(updatedSessions.length > 0 ? updatedSessions[0] : null);
        if (updatedSessions.length === 0) setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete chat session');
    }
  };

  const sendMessage = async () => {
    // ... sendMessage implementation (omitted for brevity, assume unchanged logic) ...
    // Note: To avoid repeating entire sendMessage logic here if not changing it, 
    // I will actually include it but condensed or target specific ranges if possible.
    // However, replace_file_content requires contiguous block. 
    // I will efficiently target the imports + deleteSession + UI changes separately if possible, 
    // but the deleteSession needs to be inside the component.

    // RE-INSERTING sendMessage logic here to ensure validity of the block replacement
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      let session = currentSession;
      if (!session) {
        session = await createNewSession();
        if (!session) throw new Error('Failed to create session');
      }

      const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: session.id,
          role: 'user',
          content: userMessage,
        });

      if (userMsgError) throw userMsgError;

      await loadMessages(session.id);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: session.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const { reply, relatedNotes } = await response.json();

      const { error: aiMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: session.id,
          role: 'assistant',
          content: reply,
          related_notes: relatedNotes || [],
        });

      if (aiMsgError) throw aiMsgError;

      const firstLine = userMessage.split('\n')[0].substring(0, 50);
      if (messages.length === 0) {
        await supabase
          .from('chat_sessions')
          .update({ title: firstLine })
          .eq('id', session.id);

        loadSessions();
      }

      await loadMessages(session.id);
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      if (error instanceof Error) {
        alert('Error: ' + error.message);
      } else {
        alert('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-none sm:rounded-2xl w-full max-w-6xl h-full sm:h-[80vh] flex overflow-hidden shadow-2xl relative">

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="absolute inset-0 bg-black bg-opacity-50 z-20 sm:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          absolute sm:relative z-30 h-full bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out w-72 sm:w-64
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        `}>
          <div className="p-4 border-b border-slate-200 flex justify-between items-center sm:block">
            <button
              onClick={createNewSession}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="ml-2 sm:hidden p-2 text-slate-500 hover:bg-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${currentSession?.id === session.id
                  ? 'bg-blue-100'
                  : 'hover:bg-slate-100'
                  }`}
              >
                <button
                  onClick={() => {
                    setCurrentSession(session);
                    setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-2 flex-1 text-left ${currentSession?.id === session.id
                    ? 'text-blue-800 font-medium'
                    : 'text-slate-700'
                    }`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-sm w-32">{session.title}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this chat?')) deleteSession(session.id);
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Chat"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col w-full">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 hover:bg-slate-100 rounded-lg sm:hidden text-slate-600"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold text-slate-800 truncate">Study Assistant</h2>
            </div>
            <div className="flex items-center gap-2">
              {currentSession && messages.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Clear this conversation?')) deleteSession(currentSession.id);
                  }}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear Chat</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">Start a conversation</h3>
                <p className="text-slate-600">Ask me anything about your study notes</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-800'
                      }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about your study notes..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
