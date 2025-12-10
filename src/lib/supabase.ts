import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables! Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'staff' | 'student';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface StudyNote {
  id: string;
  title: string;
  description: string;
  subject: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  content_text: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  student_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  related_notes: string[];
  created_at: string;
}
