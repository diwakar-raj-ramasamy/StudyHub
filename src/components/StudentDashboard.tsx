import { useState, useEffect } from 'react';
import { supabase, StudyNote } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Search, Download, FileText, MessageSquare, BookOpen } from 'lucide-react';
import Chatbot from './Chatbot';

export default function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('study_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const subjects = ['all', ...Array.from(new Set(notes.map(note => note.subject)))];

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || note.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">StudyHub</h1>
                <p className="text-sm text-slate-600">Welcome, {profile?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowChat(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                <MessageSquare className="w-5 h-5" />
                AI Assistant
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search study notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedSubject === subject
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
                }`}
              >
                {subject.charAt(0).toUpperCase() + subject.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No notes found</h3>
            <p className="text-slate-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <div key={note.id} className="bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all overflow-hidden group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
                      {note.subject}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2 line-clamp-1">{note.title}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2 h-10">{note.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                    <span className="line-clamp-1">{note.file_name}</span>
                    <span className="ml-2">{formatFileSize(note.file_size)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{formatDate(note.created_at)}</span>
                    <a
                      href={note.file_url}
                      download
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showChat && <Chatbot onClose={() => setShowChat(false)} />}
    </div>
  );
}
