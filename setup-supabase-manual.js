const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqxfxchlfuzzgwdcldfy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeGZ4Y2hsZnV6emd3ZGNsZGZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU2OTMxOCwiZXhwIjoyMDc3MTQ1MzE4fQ.IDw08usAA3RI02N0485cBCvueqfuEzGWZPT0kTPDyv0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupDatabase() {
  try {
    console.log('🔄 Setting up Supabase database...');

    // Test basic connection
    console.log('1. Testing connection...');
    const { data: testData, error: testError } = await supabase.from('_test_connection').select('*').limit(1);

    if (testError && testError.code !== 'PGRST116') {
      console.error('❌ Connection test failed:', testError.message);
      return;
    }

    console.log('✅ Connection successful!');

    // Create Users table
    console.log('2. Creating Users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'SO_ASSET_USER', 'VIEWER')),
          isActive BOOLEAN DEFAULT true,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          createdBy TEXT,
          FOREIGN KEY (createdBy) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_createdAt ON users(createdAt);
      `
    });

    if (usersError) {
      console.error('❌ Error creating users table:', usersError.message);
    } else {
      console.log('✅ Users table created successfully');
    }

    // Create Employees table
    console.log('3. Creating Employees table...');
    const { error: employeesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS employees (
          id TEXT PRIMARY KEY,
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

        CREATE INDEX IF NOT EXISTS idx_employees_employeeId ON employees(employeeId);
        CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
        CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
      `
    });

    if (employeesError) {
      console.error('❌ Error creating employees table:', employeesError.message);
    } else {
      console.log('✅ Employees table created successfully');
    }

    // Create Sites table
    console.log('4. Creating Sites table...');
    const { error: sitesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS sites (
          id TEXT PRIMARY KEY,
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

        CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name);
      `
    });

    if (sitesError) {
      console.error('❌ Error creating sites table:', sitesError.message);
    } else {
      console.log('✅ Sites table created successfully');
    }

    // Create Departments table
    console.log('5. Creating Departments table...');
    const { error: departmentsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS departments (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
      `
    });

    if (departmentsError) {
      console.error('❌ Error creating departments table:', departmentsError.message);
    } else {
      console.log('✅ Departments table created successfully');
    }

    // Create Categories table
    console.log('6. Creating Categories table...');
    const { error: categoriesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
      `
    });

    if (categoriesError) {
      console.error('❌ Error creating categories table:', categoriesError.message);
    } else {
      console.log('✅ Categories table created successfully');
    }

    // Create Assets table
    console.log('7. Creating Assets table...');
    const { error: assetsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS assets (
          id TEXT PRIMARY KEY,
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

        CREATE INDEX IF NOT EXISTS idx_assets_noAsset ON assets(noAsset);
        CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
        CREATE INDEX IF NOT EXISTS idx_assets_siteId ON assets(siteId);
        CREATE INDEX IF NOT EXISTS idx_assets_categoryId ON assets(categoryId);
        CREATE INDEX IF NOT EXISTS idx_assets_departmentId ON assets(departmentId);
        CREATE INDEX IF NOT EXISTS idx_assets_picId ON assets(picId);
      `
    });

    if (assetsError) {
      console.error('❌ Error creating assets table:', assetsError.message);
    } else {
      console.log('✅ Assets table created successfully');
    }

    console.log('\n🎉 Database setup completed!');
    console.log('📊 Tables created: users, employees, sites, departments, categories, assets');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Alternative approach:');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. SQL Editor');
    console.log('3. Run the SQL manually from the schema file');
  }
}

setupDatabase();