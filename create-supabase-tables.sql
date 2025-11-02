-- Complete schema for Supabase
-- Run this in Supabase SQL Editor to create all missing tables

-- SO Sessions table
CREATE TABLE IF NOT EXISTS so_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Active',
    total_assets INTEGER DEFAULT 0,
    scanned_assets INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SO Session Entries table
CREATE TABLE IF NOT EXISTS so_session_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES so_sessions(id) ON DELETE CASCADE,
    asset_id UUID,
    scan_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'scanned',
    notes TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Fields table
CREATE TABLE IF NOT EXISTS custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- text, number, date, boolean, select
    options TEXT[], -- for select type
    required BOOLEAN DEFAULT false,
    target_table TEXT NOT NULL, -- assets, employees, etc.
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Values table
CREATE TABLE IF NOT EXISTS custom_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID REFERENCES custom_fields(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL, -- asset_id, employee_id, etc.
    value TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL, -- info, warning, error
    message TEXT NOT NULL,
    data JSONB,
    user_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_so_sessions_createdat ON so_sessions(createdat);
CREATE INDEX IF NOT EXISTS idx_so_session_entries_session_id ON so_session_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_target_table ON custom_fields(target_table);
CREATE INDEX IF NOT EXISTS idx_custom_values_field_entity ON custom_values(field_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_logs_createdat ON logs(createdat);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);

-- Enable Row Level Security
ALTER TABLE so_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE so_session_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own so_sessions" ON so_sessions;
DROP POLICY IF EXISTS "Users can insert so_sessions" ON so_sessions;
DROP POLICY IF EXISTS "Users can update own so_sessions" ON so_sessions;

-- Create RLS policies (allow all for now since we have our own auth)
CREATE POLICY "Enable all operations for so_sessions" ON so_sessions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for so_session_entries" ON so_session_entries
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for custom_fields" ON custom_fields
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for custom_values" ON custom_values
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for logs" ON logs
    FOR ALL USING (true) WITH CHECK (true);