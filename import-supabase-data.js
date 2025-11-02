const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
  try {
    console.log('🔄 Starting import to Supabase...');

    const exportDir = path.join(__dirname, 'database-export');

    // Check if export directory exists
    if (!fs.existsSync(exportDir)) {
      console.error('❌ Export directory not found. Please run "npm run export:data" first.');
      process.exit(1);
    }

    // Read exported data
    const fullExportPath = path.join(exportDir, 'full-export.json');
    const exportData = JSON.parse(fs.readFileSync(fullExportPath, 'utf8'));

    // Import in the correct order (respecting foreign keys)
    const importOrder = [
      'sites',
      'categories',
      'departments',
      'employees',
      'users',
      'assetCustomFields',
      'assets',
      'sOSessions',
      'sOAssetEntries',
      'assetCustomValues'
    ];

    let totalImported = 0;

    for (const table of importOrder) {
      const data = exportData[table];
      if (!data || data.length === 0) {
        console.log(`⏭️  Skipping ${table} - no data`);
        continue;
      }

      console.log(`📥 Importing ${data.length} records to ${table}...`);

      // Handle password hashing for users
      if (table === 'users') {
        const bcrypt = require('bcryptjs');
        for (const user of data) {
          if (user.password && !user.password.startsWith('$2')) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        }
      }

      const { data: insertedData, error } = await supabase
        .from(table)
        .upsert(data, { onConflict: 'id' })
        .select();

      if (error) {
        console.error(`❌ Error importing ${table}:`, error.message);
        // Continue with other tables
      } else {
        console.log(`✅ Successfully imported ${insertedData?.length || data.length} records to ${table}`);
        totalImported += insertedData?.length || data.length;
      }
    }

    console.log(`\n🎉 Import completed! Total records imported: ${totalImported}`);

    // Verify import
    console.log('\n📊 Verification:');
    for (const table of importOrder) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`  ${table}: ${count} records`);
      }
    }

  } catch (error) {
    console.error('❌ Import failed:', error.message);
  }
}

importData();