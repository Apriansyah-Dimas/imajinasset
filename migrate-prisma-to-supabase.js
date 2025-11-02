const fs = require('fs');
const path = require('path');

const apiDir = './src/app/api';

// Prisma to Supabase operation mappings
const operationMappings = {
  // findMany -> select with order
  'findMany\\(\\{([^}]+)\\}\\)': (match, options) => {
    // Extract orderBy, where, take, skip from options
    const orderByMatch = options.match(/orderBy:\s*{\s*([^}]+)\s*}/);
    const whereMatch = options.match(/where:\s*{\s*([^}]+)\s*}/);
    const takeMatch = options.match(/take:\s*(\d+)/);
    const skipMatch = options.match(/skip:\s*(\d+)/);

    let query = '.select(\'*\')';

    if (orderByMatch) {
      const orderBy = orderByMatch[1].replace(/(\w+):\s*['"]?(desc|asc)['"]?/g, '$1.$2');
      query += `.order('${orderBy.split(':')[0]}', { ascending: ${orderBy.split(':')[1] === 'asc'} })`;
    }

    if (takeMatch) {
      const limit = parseInt(takeMatch[1]);
      if (skipMatch) {
        const offset = parseInt(skipMatch[1]);
        query += `.range(${offset}, ${offset + limit - 1})`;
      } else {
        query += `.limit(${limit})`;
      }
    }

    return query;
  },

  // findUnique -> select with eq
  'findUnique\\(\\{\\s*where:\\s*{[^}]*id:\\s*([^}]+)[^}]*}\\s*}\\)': (match, idValue) => {
    return `.select('*').eq('id', ${idValue}).single()`;
  },

  // findFirst -> select with eq/limit
  'findFirst\\(\\{([^}]+)\\}\\)': (match, options) => {
    return '.select(\'*\').limit(1).single()';
  },

  // create -> insert
  'create\\(\\{\\s*data:\\s*({[^}]+})\\s*}\\)': (match, data) => {
    return `.insert(${data}).select().single()`;
  },

  // createMany -> insert (Supabase doesn't have createMany)
  'createMany\\(\\{\\s*data:\\s*([^}]+)\\s*}\\)': (match, data) => {
    return `.insert(${data}).select()`;
  },

  // update -> update
  'update\\(\\{\\s*where:\\s*{[^}]*id:\\s*([^}]+)[^}]*},\\s*data:\\s*({[^}]+})\\s*}\\)': (match, idValue, data) => {
    return `.eq('id', ${idValue}).update(${data}).select().single()`;
  },

  // updateMany -> update
  'updateMany\\(\\{\\s*where:\\s*({[^}]+}),\\s*data:\\s*({[^}]+})\\s*}\\)': (match, where, data) => {
    return `.update(${data})`;
  },

  // delete -> delete
  'delete\\(\\{\\s*where:\\s*{[^}]*id:\\s*([^}]+)[^}]*}\\s*}\\)': (match, idValue) => {
    return `.eq('id', ${idValue}).delete()`;
  },

  // deleteMany -> delete
  'deleteMany\\(\\{\\s*where:\\s*({[^}]+})\\s*}\\)': (match, where) => {
    return `.delete()`;
  },

  // count -> select with count
  'count\\(\\)': () => {
    return '.select(\'*\', { count: \'exact\', head: true })';
  }
};

// Table name mappings (Prisma -> Supabase)
const tableMappings = {
  'user': 'users',
  'asset': 'assets',
  'category': 'categories',
  'site': 'sites',
  'department': 'departments',
  'employee': 'employees',
  'sOSession': 'so_sessions',
  'sOSessionEntry': 'so_session_entries',
  'customField': 'custom_fields',
  'customValue': 'custom_values',
  'log': 'logs',
  'backup': 'backups'
};

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Replace import statement
    if (content.includes("import { db } from '@/lib/db'")) {
      content = content.replace(
        "import { db } from '@/lib/db'",
        "import { supabaseAdmin } from '@/lib/supabase'"
      );
      changed = true;
    }

    // Replace table references
    Object.entries(tableMappings).forEach(([prismaTable, supabaseTable]) => {
      const tableRegex = new RegExp(`db\\.${prismaTable}`, 'g');
      content = content.replace(tableRegex, `supabaseAdmin.from('${supabaseTable}')`);
      changed = changed || tableRegex.test(content);
    });

    // Replace operations
    Object.entries(operationMappings).forEach(([pattern, replacer]) => {
      const regex = new RegExp(pattern, 'g');
      content = content.replace(regex, replacer);
      changed = changed || regex.test(content);
    });

    // Handle specific patterns that need more complex logic
    // Replace .then() patterns with await
    content = content.replace(
      /\.then\(\s*data\s*=>\s*data\s*\)/g,
      ''
    );

    // Add destructuring for Supabase responses
    content = content.replace(
      /const\s+(\w+)\s*=\s*await\s+(supabaseAdmin\.from\([^)]+\)[^.]+\([^)]*\))/g,
      'const { data: $1, error } = await $2'
    );

    if (changed) {
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
      if (migrateFile(fullPath)) {
        migratedCount++;
      }
    }
  });

  return migratedCount;
}

console.log('🔄 Starting migration from Prisma to Supabase...');
console.log('⚠️  This is an automated migration - please review changes carefully!\n');

const migratedFilesCount = findAndMigrateFiles(apiDir);
console.log(`\n✅ Migration complete! Processed ${migratedFilesCount} files.`);
console.log('\n📝 Next steps:');
console.log('1. Run the SQL script in create-supabase-tables.sql in Supabase');
console.log('2. Test the migrated API routes');
console.log('3. Review and fix any remaining issues manually');