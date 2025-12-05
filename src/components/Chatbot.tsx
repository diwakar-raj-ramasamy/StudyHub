import { useState, useEffect, useRef } from 'react';
import { supabase, ChatSession, ChatMessage } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Send, Plus, MessageSquare, Loader2 } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

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

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('student_id', profile?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
      if (data && data.length > 0) {
        setCurrentSession(data[0]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
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
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentSession || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSession.id,
          role: 'user',
          content: userMessage,
        });

      if (userMsgError) throw userMsgError;

      await loadMessages(currentSession.id);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: currentSession.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const { reply, relatedNotes } = await response.json();

      const { error: aiMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSession.id,
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
          .eq('id', currentSession.id);

        loadSessions();
      }

      await loadMessages(currentSession.id);
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[80vh] flex overflow-hidden shadow-2xl">
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <button
              onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setCurrentSession(session)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  currentSession?.id === session.id
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-sm">{session.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
            <h2 className="text-xl font-bold text-slate-800">AI Study Assistant</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
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
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
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
                disabled={loading || !currentSession}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim() || !currentSession}
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
