const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function backupData() {
  try {
    console.log('Starting backup...');

    // Backup all data
    const assets = await prisma.asset.findMany();
    const sites = await prisma.site.findMany();
    const categories = await prisma.category.findMany();
    const departments = await prisma.department.findMany();
    const soSessions = await prisma.sOSession.findMany();
    const soAssetEntries = await prisma.sOAssetEntry.findMany();

    const backup = {
      assets,
      sites,
      categories,
      departments,
      soSessions,
      soAssetEntries,
      backupDate: new Date().toISOString()
    };

    // Save backup to file
    const fs = require('fs');
    fs.writeFileSync('database_backup.json', JSON.stringify(backup, null, 2));

    console.log('✅ Backup completed!');
    console.log(`📊 Assets: ${assets.length}`);
    console.log(`🏢 Sites: ${sites.length}`);
    console.log(`📁 Categories: ${categories.length}`);
    console.log(`🏛️ Departments: ${departments.length}`);
    console.log(`📋 SO Sessions: ${soSessions.length}`);
    console.log(`📝 SO Asset Entries: ${soAssetEntries.length}`);
    console.log('💾 Data saved to: database_backup.json');

  } catch (error) {
    console.error('❌ Backup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupData();