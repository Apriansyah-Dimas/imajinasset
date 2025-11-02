-- Complete Database Schema for Supabase
-- Converted from Prisma migrations
-- Run this in Supabase SQL Editor to create ALL tables

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS asset_custom_values CASCADE;
DROP TABLE IF EXISTS asset_custom_fields CASCADE;
DROP TABLE IF EXISTS so_asset_entries CASCADE;
DROP TABLE IF EXISTS so_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS sites CASCADE;

-- Create Sites table
CREATE TABLE sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Indonesia',
    phone TEXT,
    email TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Categories table
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Departments table
CREATE TABLE departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Employees table
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    department TEXT,
    position TEXT,
    join_date TIMESTAMP WITH TIME ZONE,
    isactive BOOLEAN DEFAULT true,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'VIEWER',
    isactive BOOLEAN DEFAULT true,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    createdby TEXT REFERENCES users(id)
);

-- Create Assets table
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    no_asset TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'Unidentified',
    serial_no TEXT,
    purchase_date TIMESTAMP WITH TIME ZONE,
    cost DECIMAL,
    brand TEXT,
    model TEXT,
    site_id TEXT REFERENCES sites(id) ON DELETE SET NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    pic_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    pic TEXT,
    image_url TEXT,
    notes TEXT,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create SO Sessions table
CREATE TABLE so_sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Active',
    total_assets INTEGER DEFAULT 0,
    scanned_assets INTEGER DEFAULT 0,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create SO Asset Entries table
CREATE TABLE so_asset_entries (
    id TEXT PRIMARY KEY,
    so_session_id TEXT NOT NULL REFERENCES so_sessions(id) ON DELETE RESTRICT,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Scanned',
    isidentified BOOLEAN DEFAULT false,
    temp_name TEXT,
    temp_status TEXT,
    temp_serial_no TEXT,
    temp_pic TEXT,
    temp_notes TEXT,
    temp_brand TEXT,
    temp_model TEXT,
    temp_cost DECIMAL,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(so_session_id, asset_id)
);

-- Create Asset Custom Fields table
CREATE TABLE asset_custom_fields (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    required BOOLEAN DEFAULT false,
    isactive BOOLEAN DEFAULT true,
    show_condition TEXT,
    options TEXT,
    default_value TEXT,
    description TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Asset Custom Values table
CREATE TABLE asset_custom_values (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    custom_field_id TEXT NOT NULL REFERENCES asset_custom_fields(id) ON DELETE CASCADE,
    string_value TEXT,
    number_value DECIMAL,
    date_value TIMESTAMP WITH TIME ZONE,
    boolean_value BOOLEAN,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(asset_id, custom_field_id)
);

-- Create additional tables for full functionality
CREATE TABLE logs (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    user_id TEXT REFERENCES users(id),
    ip_address TEXT,
    user_agent TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE backups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    status TEXT DEFAULT 'completed',
    createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    createdby TEXT REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_assets_no_asset ON assets(no_asset);
CREATE INDEX idx_assets_site_id ON assets(site_id);
CREATE INDEX idx_assets_category_id ON assets(category_id);
CREATE INDEX idx_assets_department_id ON assets(department_id);
CREATE INDEX idx_assets_pic_id ON assets(pic_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_createdat ON assets(createdat);

CREATE INDEX idx_so_sessions_year ON so_sessions(year);
CREATE INDEX idx_so_sessions_status ON so_sessions(status);
CREATE INDEX idx_so_sessions_createdat ON so_sessions(createdat);

CREATE INDEX idx_so_asset_entries_session_id ON so_asset_entries(so_session_id);
CREATE INDEX idx_so_asset_entries_asset_id ON so_asset_entries(asset_id);
CREATE INDEX idx_so_asset_entries_scanned_at ON so_asset_entries(scanned_at);

CREATE INDEX idx_employee_email ON employees(email);
CREATE INDEX idx_employee_employee_id ON employees(employee_id);
CREATE INDEX idx_employee_department ON employees(department);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_isactive ON users(isactive);

CREATE INDEX idx_logs_createdat ON logs(createdat);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_user_id ON logs(user_id);

-- Enable Row Level Security
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE so_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE so_asset_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_custom_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now since we have our own auth system)
CREATE POLICY "Enable all operations for sites" ON sites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for departments" ON departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for assets" ON assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for so_sessions" ON so_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for so_asset_entries" ON so_asset_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for asset_custom_fields" ON asset_custom_fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for asset_custom_values" ON asset_custom_values FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for logs" ON logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for backups" ON backups FOR ALL USING (true) WITH CHECK (true);

-- Insert default data
INSERT INTO users (id, email, name, password, role, isactive) VALUES
('cmh8y4cbk0000x5lgt87jfc36', 'admin@assetso.com', 'Administrator', '$2b$10$rFzZ8KJKzQzqYQK/VDYU1u7KqKqYQKqYQKqYQKqYQKqYQKqYQKqYQK', 'ADMIN', true),
('cmh8y4cbk0000x5lgt87jfc37', 'soasset@assetso.com', 'SO Asset User', '$2b$10$rFzZ8KJKzQzqYQK/VDYU1u7KqKqYQKqYQKqYQKqYQKqYQKqYQKqYQK', 'SO_ASSET_USER', true),
('cmh8y4cbk0000x5lgt87jfc38', 'viewer@assetso.com', 'Viewer User', '$2b$10$rFzZ8KJKzQzqYQK/VDYU1u7KqKqYQKqYQKqYQKqYQKqYQKqYQKqYQK', 'VIEWER', true);

-- Note: The passwords above are bcrypt hashes. You'll need to update them with actual hashes or use the registration endpoint to create new users.
