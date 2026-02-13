-- SQLite schema for SM Web Systems LMS (run this in your server repo to fix "no such table: users")
-- Run: npm run db:schema  (uses this file by default)

-- Users table (auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  enrollment_number TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by_id TEXT REFERENCES users(id),
  feedback TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Course documents table
CREATE TABLE IF NOT EXISTS course_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_mime_type TEXT,
  uploaded_by_id TEXT NOT NULL REFERENCES users(id),
  uploaded_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);
CREATE INDEX IF NOT EXISTS idx_students_semester ON students(semester);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON course_documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON course_documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON course_documents(uploaded_by_id);

-- Forum tables
CREATE TABLE IF NOT EXISTS forum_topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_forum_topics_author ON forum_topics(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic ON forum_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);

-- Courses table (Course API: title, description, sections stored as JSON)
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sections TEXT NOT NULL DEFAULT '[]'
);
