const { PrismaClient } = require('@prisma/client');

async function updateSOAssetsCount() {
  const db = new PrismaClient();

  try {
    console.log('Updating SO sessions asset count...');

    // Get current total assets from SQLite
    const totalAssets = await db.asset.count();
    console.log(`Current total assets in SQLite: ${totalAssets}`);

    // Update all SO sessions to use the correct asset count
    const result = await db.sOSession.updateMany({
      where: {
        totalAssets: {
          not: totalAssets
        }
      },
      data: {
        totalAssets: totalAssets,
        updatedAt: new Date()
      }
    });

    console.log(`Updated ${result.count} SO sessions with new asset count`);

    // Verify the update
    const sessions = await db.sOSession.findMany({
      select: {
        id: true,
        name: true,
        totalAssets: true,
        scannedAssets: true
      }
    });

    console.log('\nUpdated SO Sessions:');
    sessions.forEach(session => {
      console.log(`- ${session.name}: ${session.totalAssets} total, ${session.scannedAssets} scanned`);
    });

  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    await db.$disconnect();
  }
}

updateSOAssetsCount();