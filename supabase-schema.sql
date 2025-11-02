-- AssetSO Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'SO_ASSET_USER', 'VIEWER')),
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  createdBy TEXT REFERENCES users(id)
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
  employeeId TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  department TEXT,
  position TEXT,
  joinDate TIMESTAMP WITH TIME ZONE,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
  name TEXT UNIQUE NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  postalCode TEXT,
  country TEXT DEFAULT 'Indonesia',
  phone TEXT,
  email TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
  name TEXT NOT NULL,
  noAsset TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'Unidentified' CHECK (status IN ('Unidentified', 'Active', 'Broken', 'Lost/Missing', 'Sell')),
  serialNo TEXT,
  purchaseDate TIMESTAMP WITH TIME ZONE,
  cost DECIMAL,
  brand TEXT,
  model TEXT,
  siteId TEXT REFERENCES sites(id),
  categoryId TEXT REFERENCES categories(id),
  departmentId TEXT REFERENCES departments(id),
  picId TEXT REFERENCES employees(id),
  pic TEXT,
  imageUrl TEXT,
  notes TEXT,
  dateCreated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SO Sessions table
CREATE TABLE IF NOT EXISTS so_sessions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Cancelled')),
  totalAssets INTEGER DEFAULT 0,
  scannedAssets INTEGER DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  startedAt TIMESTAMP WITH TIME ZONE,
  completedAt TIMESTAMP WITH TIME ZONE
);

-- SO Asset Entries table
CREATE TABLE IF NOT EXISTS so_asset_entries (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
  soSessionId TEXT NOT NULL REFERENCES so_sessions(id) ON DELETE CASCADE,
  assetId TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  scannedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'Scanned' CHECK (status IN ('Scanned', 'Updated', 'Not Found')),
  isIdentified BOOLEAN DEFAULT false,
  tempName TEXT,
  tempStatus TEXT,
  tempSerialNo TEXT,
  tempPic TEXT,
  tempNotes TEXT,
  tempBrand TEXT,
  tempModel TEXT,
  tempCost DECIMAL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset Custom Fields table
CREATE TABLE IF NOT EXISTS asset_custom_fields (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
  name TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  fieldType TEXT NOT NULL CHECK (fieldType IN ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'TEXTAREA')),
  required BOOLEAN DEFAULT false,
  isActive BOOLEAN DEFAULT true,
  showCondition TEXT,
  options TEXT,
  defaultValue TEXT,
  description TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset Custom Values table
CREATE TABLE IF NOT EXISTS asset_custom_values (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
  assetId TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  customFieldId TEXT NOT NULL REFERENCES asset_custom_fields(id) ON DELETE CASCADE,
  stringValue TEXT,
  numberValue DECIMAL,
  dateValue TIMESTAMP WITH TIME ZONE,
  booleanValue BOOLEAN,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assetId, customFieldId)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_createdAt ON users(createdAt);

CREATE INDEX IF NOT EXISTS idx_employees_employeeId ON employees(employeeId);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name);

CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

CREATE INDEX IF NOT EXISTS idx_assets_noAsset ON assets(noAsset);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_siteId ON assets(siteId);
CREATE INDEX IF NOT EXISTS idx_assets_categoryId ON assets(categoryId);
CREATE INDEX IF NOT EXISTS idx_assets_departmentId ON assets(departmentId);
CREATE INDEX IF NOT EXISTS idx_assets_picId ON assets(picId);

CREATE INDEX IF NOT EXISTS idx_so_sessions_year ON so_sessions(year);
CREATE INDEX IF NOT EXISTS idx_so_sessions_status ON so_sessions(status);

CREATE INDEX IF NOT EXISTS idx_so_asset_entries_sessionId ON so_asset_entries(soSessionId);
CREATE INDEX IF NOT EXISTS idx_so_asset_entries_assetId ON so_asset_entries(assetId);

CREATE INDEX IF NOT EXISTS idx_asset_custom_values_assetId ON asset_custom_values(assetId);
CREATE INDEX IF NOT EXISTS idx_asset_custom_values_customFieldId ON asset_custom_values(customFieldId);

-- Insert default data
INSERT INTO sites (name, city, province) VALUES
('Jakarta Office', 'Jakarta', 'DKI Jakarta'),
('Surabaya Office', 'Surabaya', 'East Java'),
('Bandung Office', 'Bandung', 'West Java')
ON CONFLICT (name) DO NOTHING;

INSERT INTO departments (name, description) VALUES
('IT Department', 'Information Technology'),
('Finance Department', 'Finance and Accounting'),
('Operations Department', 'Operations and Logistics')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE so_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE so_asset_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_custom_values ENABLE ROW LEVEL SECURITY;

-- Create policies (you can customize these based on your security requirements)
-- For now, allow all operations (you can restrict later)
CREATE POLICY "Enable all operations for all users" ON users FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON employees FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON sites FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON departments FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON categories FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON assets FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON so_sessions FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON so_asset_entries FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON asset_custom_fields FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON asset_custom_values FOR ALL USING (true);