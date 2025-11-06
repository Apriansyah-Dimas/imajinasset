const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function importSOSessions() {
  const db = new PrismaClient();

  try {
    console.log('Starting SO sessions import...');

    // Read backup file
    const backupPath = path.join(__dirname, 'so-sessions-backup.json');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log(`Found ${backupData.length} sessions to import`);

    let importedCount = 0;

    for (const session of backupData) {
      try {
        await db.sOSession.create({
          data: {
            id: session.id,
            name: session.name,
            year: session.year,
            description: session.description || null,
            status: session.status || 'Active',
            totalAssets: session.total_assets || 0,
            scannedAssets: session.scanned_assets || 0,
            startedAt: session.started_at ? new Date(session.started_at) : null,
            completedAt: session.completed_at ? new Date(session.completed_at) : null,
            createdAt: new Date(session.createdat),
            updatedAt: new Date(session.updatedat)
          }
        });
        importedCount++;
        console.log(`Imported session: ${session.name} (${session.total_assets} assets)`);
      } catch (error) {
        // Skip duplicates
        if (error.code !== 'P2002') { // P2002 = Unique constraint violation
          console.error('Error importing session:', session.name, error.message);
        }
      }
    }

    console.log(`Successfully imported ${importedCount} SO sessions`);

    // Verify import
    const totalSessions = await db.sOSession.count();
    console.log(`Total sessions in database: ${totalSessions}`);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await db.$disconnect();
  }
}

importSOSessions();