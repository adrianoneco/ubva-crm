-- Create schedule_requests table
CREATE TABLE IF NOT EXISTS schedule_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  picture_url TEXT,
  phone VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
