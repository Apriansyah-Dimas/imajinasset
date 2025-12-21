const fs = require('fs');
const path = require('path');

// Simulate reading JSON backup
const backupData = JSON.parse(fs.readFileSync('../backups/database_backup.json', 'utf8'));

console.log('🔍 Mencari data notes di backup...');

// Extract SO entries with non-null crucial_notes
const entriesWithNotes = backupData.so_asset_entries.filter(entry => {
  return entry.crucial_notes !== null &&
         entry.crucial_notes !== undefined &&
         entry.crucial_notes !== '' &&
         entry.crucial_notes.trim() !== '';
});

console.log(`✅ Ditemukan ${entriesWithNotes.length} entries dengan notes`);

// Show sample of notes found
console.log('\n📝 Sample notes yang ditemukan:');
entriesWithNotes.slice(0, 5).forEach((entry, index) => {
  console.log(`${index + 1}. ID: ${entry.id}`);
  console.log(`   Asset: ${entry.temp_name || 'Unknown'}`);
  console.log(`   Notes: ${entry.crucial_notes}`);
  console.log(`   Is Crucial: ${entry.is_crucial}`);
  console.log('');
});

// Generate SQL script to update database
let sqlScript = '-- Import notes dari JSON backup\n';
sqlScript += '-- Update so_asset_entries dengan pending_notes dari backup\n\n';

entriesWithNotes.forEach(entry => {
  // Escape single quotes in notes
  const escapedNotes = entry.crucial_notes.replace(/'/g, "''");

  sqlScript += `UPDATE so_asset_entries SET pending_notes = '${escapedNotes}', is_crucial = ${entry.is_crucial ? 1 : 0} WHERE id = '${entry.id}';\n`;
});

// Add verification query
sqlScript += `\n-- Verification query\nSELECT COUNT(*) as updated_entries FROM so_asset_entries WHERE pending_notes IS NOT NULL;\n`;

// Write SQL script to file
fs.writeFileSync('./import_notes_script.sql', sqlScript);

console.log('✅ SQL script berhasil dibuat: import_notes_script.sql');
console.log(`📊 Total ${entriesWithNotes.length} entries akan diupdate dengan notes`);

// Show some statistics
const uniqueNotes = [...new Set(entriesWithNotes.map(e => e.crucial_notes))];
console.log(`🔢 Total ${uniqueNotes.length} unique notes ditemukan`);

console.log('\n🚀 Jalankan SQL script dengan: DATABASE_URL="file:./dev.db" npx prisma db execute --file=./import_notes_script.sql --schema=./prisma/schema.prisma');