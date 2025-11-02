const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://yqxfxchlfuzzgwdcldfy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeGZ4Y2hsZnV6emd3ZGNsZGZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU2OTMxOCwiZXhwIjoyMDc3MTQ1MzE4fQ.IDw08usAA3RI02N0485cBCvueqfuEzGWZPT0kTPDyv0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function importDataToSupabase() {
  try {
    console.log('🔄 Importing data to Supabase...');

    // Import Users
    console.log('1. Importing Users...');
    const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'database-export', 'users.json'), 'utf8'));

    for (const user of usersData) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.name,
          password: user.password, // Already hashed
          role: user.role,
          isactive: user.isActive,
          createdat: user.createdAt,
          updatedat: user.updatedAt,
          createdby: user.createdBy
        });

      if (error) {
        console.error(`❌ Error importing user ${user.email}:`, error.message);
      } else {
        console.log(`✅ Imported user: ${user.email}`);
      }
    }

    // Import Employees
    console.log('2. Importing Employees...');
    const employeesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'database-export', 'employees.json'), 'utf8'));

    for (const employee of employeesData) {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          id: employee.id,
          employeeid: employee.employeeId,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          joindate: employee.joinDate,
          isactive: employee.isActive,
          createdat: employee.createdAt,
          updatedat: employee.updatedAt
        });

      if (error) {
        console.error(`❌ Error importing employee ${employee.name}:`, error.message);
      } else {
        console.log(`✅ Imported employee: ${employee.name}`);
      }
    }

    // Sites sudah ada dari default data (Jakarta, Surabaya, Bandung)
    console.log('3. Skipping Sites (already have default data)');

    // Import Departments
    console.log('4. Importing Departments...');
    const departmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'database-export', 'departments.json'), 'utf8'));

    for (const dept of departmentsData) {
      const { data, error } = await supabase
        .from('departments')
        .insert({
          id: dept.id,
          name: dept.name,
          description: dept.description,
          createdat: dept.createdAt,
          updatedat: dept.updatedAt
        });

      if (error) {
        console.error(`❌ Error importing department ${dept.name}:`, error.message);
      } else {
        console.log(`✅ Imported department: ${dept.name}`);
      }
    }

    console.log('\n🎉 Import completed!');

    // Verification
    console.log('\n📊 Verification:');
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: employeeCount } = await supabase.from('employees').select('*', { count: 'exact', head: true });
    const { count: siteCount } = await supabase.from('sites').select('*', { count: 'exact', head: true });
    const { count: deptCount } = await supabase.from('departments').select('*', { count: 'exact', head: true });

    console.log(`  Users: ${userCount}`);
    console.log(`  Employees: ${employeeCount}`);
    console.log(`  Sites: ${siteCount}`);
    console.log(`  Departments: ${deptCount}`);

  } catch (error) {
    console.error('❌ Import failed:', error.message);
  }
}

importDataToSupabase();