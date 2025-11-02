const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restoreData() {
  try {
    console.log('Starting restore...');

    // Read backup data
    const backupData = JSON.parse(fs.readFileSync('database_backup.json', 'utf8'));

    // Restore data in correct order (due to foreign key constraints)
    console.log('🏢 Restoring Sites...');
    for (const site of backupData.sites) {
      await prisma.site.create({
        data: {
          id: site.id,
          name: site.name,
          createdAt: site.createdAt,
          updatedAt: site.updatedAt
        }
      });
    }

    console.log('📁 Restoring Categories...');
    for (const category of backupData.categories) {
      await prisma.category.create({
        data: {
          id: category.id,
          name: category.name,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        }
      });
    }

    console.log('🏛️ Restoring Departments...');
    for (const department of backupData.departments) {
      await prisma.department.create({
        data: {
          id: department.id,
          name: department.name,
          createdAt: department.createdAt,
          updatedAt: department.updatedAt
        }
      });
    }

    console.log('📊 Restoring Assets...');
    for (const asset of backupData.assets) {
      await prisma.asset.create({
        data: {
          id: asset.id,
          name: asset.name,
          noAsset: asset.noAsset,
          status: asset.status,
          serialNo: asset.serialNo,
          purchaseDate: asset.purchaseDate,
          cost: asset.cost,
          brand: asset.brand,
          model: asset.model,
          siteId: asset.siteId,
          categoryId: asset.categoryId,
          departmentId: asset.departmentId,
          pic: asset.pic,
          dateCreated: asset.dateCreated,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt
        }
      });
    }

    console.log('📋 Restoring SO Sessions...');
    for (const soSession of backupData.soSessions) {
      await prisma.sOSession.create({
        data: {
          id: soSession.id,
          name: soSession.name,
          year: soSession.year,
          description: soSession.description,
          status: soSession.status,
          totalAssets: soSession.totalAssets,
          scannedAssets: soSession.scannedAssets,
          createdAt: soSession.createdAt,
          updatedAt: soSession.updatedAt,
          startedAt: soSession.startedAt,
          completedAt: soSession.completedAt
        }
      });
    }

    console.log('📝 Restoring SO Asset Entries...');
    for (const entry of backupData.soAssetEntries) {
      await prisma.sOAssetEntry.create({
        data: {
          id: entry.id,
          soSessionId: entry.soSessionId,
          assetId: entry.assetId,
          scannedAt: entry.scannedAt,
          status: entry.status,
          isIdentified: entry.isIdentified,
          tempName: entry.tempName,
          tempStatus: entry.tempStatus,
          tempSerialNo: entry.tempSerialNo,
          tempPic: entry.tempPic,
          tempNotes: entry.tempNotes,
          tempBrand: entry.tempBrand,
          tempModel: entry.tempModel,
          tempCost: entry.tempCost,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt
        }
      });
    }

    console.log('✅ Restore completed!');
    console.log(`📊 Assets: ${backupData.assets.length} restored`);
    console.log(`🏢 Sites: ${backupData.sites.length} restored`);
    console.log(`📁 Categories: ${backupData.categories.length} restored`);
    console.log(`🏛️ Departments: ${backupData.departments.length} restored`);
    console.log(`📋 SO Sessions: ${backupData.soSessions.length} restored`);
    console.log(`📝 SO Asset Entries: ${backupData.soAssetEntries.length} restored`);

  } catch (error) {
    console.error('❌ Restore failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreData();