const fs = require('fs');
const path = require('path');

const apiDir = './src/app/api';

// Prisma to Supabase mapping rules
const migrationRules = {
  // Table name mappings
  tableMappings: {
    'user': 'users',
    'asset': 'assets',
    'category': 'categories',
    'site': 'sites',
    'department': 'departments',
    'employee': 'employees',
    'sOSession': 'so_sessions',
    'sOAssetEntry': 'so_asset_entries',
    'assetCustomField': 'asset_custom_fields',
    'assetCustomValue': 'asset_custom_values',
    'systemLog': 'logs',
    'backup': 'backups'
  },

  // Column name mappings
  columnMappings: {
    'createdAt': 'createdat',
    'updatedAt': 'updatedat',
    'isActive': 'isactive',
    'createdBy': 'createdby',
    'siteId': 'site_id',
    'categoryId': 'category_id',
    'departmentId': 'department_id',
    'picId': 'pic_id',
    'serialNo': 'serial_no',
    'purchaseDate': 'purchase_date',
    'imageUrl': 'image_url',
    'dateCreated': 'date_created',
    'joinDate': 'join_date',
    'employeeId': 'employee_id',
    'soSessionId': 'so_session_id',
    'assetId': 'asset_id',
    'scannedAt': 'scanned_at',
    'isIdentified': 'isidentified',
    'tempName': 'temp_name',
    'tempStatus': 'temp_status',
    'tempSerialNo': 'temp_serial_no',
    'tempPic': 'temp_pic',
    'tempNotes': 'temp_notes',
    'tempBrand': 'temp_brand',
    'tempModel': 'temp_model',
    'tempCost': 'temp_cost',
    'customFieldId': 'custom_field_id',
    'stringValue': 'string_value',
    'numberValue': 'number_value',
    'dateValue': 'date_value',
    'booleanValue': 'boolean_value',
    'totalAssets': 'total_assets',
    'scannedAssets': 'scanned_assets',
    'startedAt': 'started_at',
    'completedAt': 'completed_at',
    'postalCode': 'postal_code'
  },

  // Operation mappings
  replacePatterns: [
    // Import replacements
    {
      pattern: /import\s*{\s*db\s*}\s*from\s*['"]@\/lib\/db['"];?/g,
      replacement: "import { supabaseAdmin } from '@/lib/supabase';"
    },
    {
      pattern: /import\s*.*PrismaClient.*from\s*['"]@prisma\/client['"];?/g,
      replacement: "import { supabaseAdmin } from '@/lib/supabase';"
    },
    {
      pattern: /const\s+prisma\s*=\s*new\s+PrismaClient\(\);?/g,
      replacement: ""
    },

    // db.tableName -> supabaseAdmin.from('table_name')
    {
      pattern: /db\.(\w+)\./g,
      replacement: (match, tableName) => {
        const mappedTable = migrationRules.tableMappings[tableName] || tableName;
        return `supabaseAdmin.from('${mappedTable}').`;
      }
    },

    // findMany -> select with order
    {
      pattern: /\.findMany\(\s*\{\s*([^}]*)\s*\}\s*\)/g,
      replacement: (match, options) => {
        let query = ".select('*')";

        // Extract orderBy
        const orderByMatch = options.match(/orderBy:\s*{\s*([^}]+)\s*}/);
        if (orderByMatch) {
          const orderBy = orderByMatch[1];
          const fieldMatch = orderBy.match(/(\w+):\s*['"]?(desc|asc)['"]?/);
          if (fieldMatch) {
            const fieldName = migrationRules.columnMappings[fieldMatch[1]] || fieldMatch[1];
            const direction = fieldMatch[2];
            query += `.order('${fieldName}', { ascending: ${direction === 'asc'} })`;
          }
        }

        // Extract where
        const whereMatch = options.match(/where:\s*{\s*([^}]+)\s*}/);
        if (whereMatch) {
          // Complex where clause handling would go here
          // For now, we'll add a placeholder
          query += " // TODO: Add where clause manually";
        }

        // Extract take/limit
        const takeMatch = options.match(/take:\s*(\d+)/);
        if (takeMatch) {
          query += `.limit(${takeMatch[1]})`;
        }

        // Extract skip/offset
        const skipMatch = options.match(/skip:\s*(\d+)/);
        if (skipMatch) {
          const limit = takeMatch ? takeMatch[1] : 10;
          const offset = parseInt(skipMatch[1]);
          query = `.range(${offset}, ${offset + limit - 1})`;
        }

        return query;
      }
    },

    // findUnique -> select with eq
    {
      pattern: /\.findUnique\(\s*\{\s*where:\s*{\s*([^:]+):\s*([^}]+)\s*}\s*\}\s*\)/g,
      replacement: (match, field, value) => {
        const fieldName = migrationRules.columnMappings[field] || field;
        return `.select('*').eq('${fieldName}', ${value}).single()`;
      }
    },

    // create -> insert
    {
      pattern: /\.create\(\s*\{\s*data:\s*({[^}]+})\s*\}\s*\)/g,
      replacement: ".insert($1).select().single()"
    },

    // update -> update
    {
      pattern: /\.update\(\s*\{\s*where:\s*{\s*([^:]+):\s*([^}]+)\s*},\s*data:\s*({[^}]+})\s*\}\s*\)/g,
      replacement: (match, field, value, data) => {
        const fieldName = migrationRules.columnMappings[field] || field;
        return `.eq('${fieldName}', ${value}).update(${data}).select().single()`;
      }
    },

    // delete -> delete
    {
      pattern: /\.delete\(\s*\{\s*where:\s*{\s*([^:]+):\s*([^}]+)\s*}\s*\}\s*\)/g,
      replacement: (match, field, value) => {
        const fieldName = migrationRules.columnMappings[field] || field;
        return `.eq('${fieldName}', ${value}).delete()`;
      }
    },

    // count -> select with count
    {
      pattern: /\.count\(\)/g,
      replacement: ".select('*', { count: 'exact', head: true })"
    },

    // Column name replacements in objects
    ...Object.entries(migrationRules.columnMappings).map(([oldName, newName]) => ({
      pattern: new RegExp(`(['"]?)${oldName}\\1:`, 'g'),
      replacement: `$1${newName}$1:`
    }))
  ]
};

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    const originalContent = content;

    // Apply all migration rules
    migrationRules.replacePatterns.forEach(rule => {
      const newContent = content.replace(rule.pattern, rule.replacement);
      if (newContent !== content) {
        changed = true;
        content = newContent;
      }
    });

    // Post-processing for common patterns
    content = content.replace(
      /const\s*{\s*(\w+)\s*}\s*=\s*await\s+(supabaseAdmin\.from\([^)]+\)[^.]+\([^)]*\))/g,
      'const { data: $1, error } = await $2'
    );

    // Add error handling for Supabase responses
    content = content.replace(
      /(\s+)(const\s*{\s*data:[^}]+}\s*=\s*await\s+supabaseAdmin\.[^(]+\([^)]*\);)/g,
      '$1// TODO: Add error handling\n$1$2\n$1if (error) {\n$1  console.error("Database error:", error);\n$1  // Handle error appropriately\n$1}\n'
    );

    if (changed && content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Migrated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
    return false;
  }
}

function findAndMigrateFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let migratedCount = 0;

  files.forEach(file => {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      migratedCount += findAndMigrateFiles(fullPath);
    } else if (file.name === 'route.ts') {
      // Skip already migrated files
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('supabaseAdmin')) {
        if (migrateFile(fullPath)) {
          migratedCount++;
        }
      }
    }
  });

  return migratedCount;
}

console.log('🚀 Starting comprehensive Prisma to Supabase migration...');
console.log('⚠️  This will migrate all API routes from Prisma to Supabase\n');

const migratedFilesCount = findAndMigrateFiles(apiDir);

console.log(`\n✅ Migration complete! Processed ${migratedFilesCount} files.`);
console.log('\n📝 Manual review required for:');
console.log('1. Complex where clauses');
console.log('2. Error handling patterns');
console.log('3. Data transformation logic');
console.log('4. Transaction handling');
console.log('\n🔄 Next steps:');
console.log('1. Test all migrated routes');
console.log('2. Fix any compilation errors');
console.log('3. Update column names in database schema if needed');
console.log('4. Remove Prisma dependencies from package.json');