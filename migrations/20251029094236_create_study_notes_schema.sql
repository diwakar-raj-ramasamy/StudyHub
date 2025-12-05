/*
  # Study Notes Platform Schema

  ## Overview
  This migration creates the complete database schema for a NotebookLM-style study platform
  where staff upload study materials and students access them with AI chatbot assistance.

  ## New Tables
  
  ### 1. `profiles`
  User profiles extending Supabase auth.users
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - Either 'staff' or 'student'
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `study_notes`
  Study materials uploaded by staff
  - `id` (uuid, primary key) - Unique identifier
  - `title` (text) - Note title
  - `description` (text) - Note description
  - `subject` (text) - Subject category
  - `file_url` (text) - URL to uploaded file in storage
  - `file_name` (text) - Original file name
  - `file_type` (text) - MIME type of file
  - `file_size` (bigint) - File size in bytes
  - `content_text` (text) - Extracted text content for AI processing
  - `uploaded_by` (uuid) - Staff member who uploaded
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. `chat_sessions`
  Chat conversation sessions
  - `id` (uuid, primary key) - Unique identifier
  - `student_id` (uuid) - Student who created session
  - `title` (text) - Session title
  - `created_at` (timestamptz) - Session creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. `chat_messages`
  Individual messages in chat sessions
  - `id` (uuid, primary key) - Unique identifier
  - `session_id` (uuid) - Parent chat session
  - `role` (text) - Either 'user' or 'assistant'
  - `content` (text) - Message content
  - `related_notes` (jsonb) - Array of related study note IDs
  - `created_at` (timestamptz) - Message timestamp

  ## Security
  
  ### Row Level Security (RLS)
  All tables have RLS enabled with policies that:
  - Profiles: Users can read/update their own profile
  - Study Notes: Staff can create/update/delete, students can only read
  - Chat Sessions: Students can manage their own sessions
  - Chat Messages: Students can access messages from their own sessions

  ## Indexes
  - Index on study_notes.subject for filtering
  - Index on study_notes.uploaded_by for staff queries
  - Index on chat_sessions.student_id for user queries
  - Index on chat_messages.session_id for fast message retrieval
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('staff', 'student')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create study_notes table
CREATE TABLE IF NOT EXISTS study_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  subject text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint DEFAULT 0,
  content_text text DEFAULT '',
  uploaded_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text DEFAULT 'New Chat',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  related_notes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_study_notes_subject ON study_notes(subject);
CREATE INDEX IF NOT EXISTS idx_study_notes_uploaded_by ON study_notes(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_student_id ON chat_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Study notes policies
CREATE POLICY "Everyone can view study notes"
  ON study_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert study notes"
  ON study_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'staff'
    )
  );

CREATE POLICY "Staff can update own study notes"
  ON study_notes FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'staff'
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'staff'
    )
  );

CREATE POLICY "Staff can delete own study notes"
  ON study_notes FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'staff'
    )
  );

-- Chat sessions policies
CREATE POLICY "Students can view own chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can create chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can delete own chat sessions"
  ON chat_sessions FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Users can view messages from own sessions"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = session_id
      AND chat_sessions.student_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own sessions"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = session_id
      AND chat_sessions.student_id = auth.uid()
    )
  );

-- Storage bucket for study notes files
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-notes', 'study-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Staff can upload study notes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'study-notes' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'staff'
    )
  );

CREATE POLICY "Everyone can view study notes files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'study-notes');

CREATE POLICY "Staff can delete own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'study-notes' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'staff'
    )
  );