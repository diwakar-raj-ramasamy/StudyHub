import { useState, useEffect } from 'react';
import { supabase, StudyNote } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileText, Trash2, LogOut, Search, Download } from 'lucide-react';

export default function StaffDashboard() {
  const { profile, signOut } = useAuth();
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('study_notes')
        .select('*')
        .eq('uploaded_by', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('study-notes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('study-notes')
        .getPublicUrl(filePath);

      const contentText = await extractTextFromFile(file);

      const { error: insertError } = await supabase
        .from('study_notes')
        .insert({
          title,
          description,
          subject,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          content_text: contentText,
          uploaded_by: profile?.id,
        });

      if (insertError) throw insertError;

      setTitle('');
      setDescription('');
      setSubject('');
      setFile(null);
      setShowUploadModal(false);
      loadNotes();
    } catch (error: any) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === 'text/plain') {
      return await file.text();
    }
    return '';
  };

  const handleDelete = async (noteId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const filePath = fileUrl.split('/study-notes/')[1];

      await supabase.storage
        .from('study-notes')
        .remove([filePath]);

      const { error } = await supabase
        .from('study_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      loadNotes();
    } catch (error: any) {
      alert('Error deleting note: ' + error.message);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Staff Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">Welcome, {profile?.full_name}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Upload className="w-5 h-5" />
            Upload Note
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No notes found</h3>
            <p className="text-slate-600">Upload your first study note to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <div key={note.id} className="bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
                      {note.subject}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">{note.title}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{note.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                    <span>{note.file_name}</span>
                    <span>{formatFileSize(note.file_size)}</span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={note.file_url}
                      download
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                    <button
                      onClick={() => handleDelete(note.id, note.file_url)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Upload Study Note</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
