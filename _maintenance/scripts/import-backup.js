const { PrismaClient } = require('@prisma/client');

const fs = require('fs');
const path = require('path');

async function importBackup() {
  const db = new PrismaClient();

  try {
    console.log('Starting backup import...');

    // Read backup file
    const backupPath = path.join(__dirname, 'database_backup.json');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log('Backup data loaded:', {
      assets: backupData.assets?.length || 0,
      categories: backupData.categories?.length || 0,
      departments: backupData.departments?.length || 0,
      sites: backupData.sites?.length || 0
    });

    // Import categories first (assets depend on them)
    if (backupData.categories && backupData.categories.length > 0) {
      console.log('Importing categories...');
      for (const category of backupData.categories) {
        await db.category.upsert({
          where: { id: category.id },
          update: { name: category.name },
          create: {
            id: category.id,
            name: category.name,
            description: category.description || null
          }
        });
      }
      console.log(`Imported ${backupData.categories.length} categories`);
    }

    // Import departments (assets depend on them)
    if (backupData.departments && backupData.departments.length > 0) {
      console.log('Importing departments...');
      for (const department of backupData.departments) {
        await db.department.upsert({
          where: { id: department.id },
          update: { name: department.name },
          create: {
            id: department.id,
            name: department.name,
            description: department.description || null
          }
        });
      }
      console.log(`Imported ${backupData.departments.length} departments`);
    }

    // Import sites (assets depend on them)
    if (backupData.sites && backupData.sites.length > 0) {
      console.log('Importing sites...');
      for (const site of backupData.sites) {
        await db.site.upsert({
          where: { id: site.id },
          update: { name: site.name },
          create: {
            id: site.id,
            name: site.name,
            address: site.address || null,
            city: site.city || null,
            province: site.province || null,
            postalCode: site.postalCode || null,
            country: site.country || 'Indonesia',
            phone: site.phone || null,
            email: site.email || null
          }
        });
      }
      console.log(`Imported ${backupData.sites.length} sites`);
    }

    // Import assets last
    if (backupData.assets && backupData.assets.length > 0) {
      console.log('Importing assets...');
      let importedCount = 0;

      for (const asset of backupData.assets) {
        try {
          await db.asset.create({
            data: {
              id: asset.id,
              name: asset.name,
              noAsset: asset.noAsset,
              status: asset.status || 'Unidentified',
              serialNo: asset.serialNo || null,
              purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : null,
              cost: asset.cost || null,
              brand: asset.brand || null,
              model: asset.model || null,
              siteId: asset.siteId || null,
              categoryId: asset.categoryId || null,
              departmentId: asset.departmentId || null,
              pic: asset.pic || null,
              picId: null, // Not in backup
              imageUrl: asset.imageUrl || null,
              notes: asset.notes || null,
              dateCreated: asset.dateCreated ? new Date(asset.dateCreated) : new Date(),
              createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
              updatedAt: asset.updatedAt ? new Date(asset.updatedAt) : new Date()
            }
          });
          importedCount++;
        } catch (error) {
          // Skip duplicates
          if (error.code !== 'P2002') { // P2002 = Unique constraint violation
            console.error('Error importing asset:', asset.noAsset, error.message);
          }
        }
      }

      console.log(`Imported ${importedCount} assets`);
    }

    console.log('Backup import completed successfully!');

    // Verify data
    const totalAssets = await db.asset.count();
    const totalCategories = await db.category.count();
    const totalDepartments = await db.department.count();
    const totalSites = await db.site.count();

    console.log('\nDatabase summary:');
    console.log(`Assets: ${totalAssets}`);
    console.log(`Categories: ${totalCategories}`);
    console.log(`Departments: ${totalDepartments}`);
    console.log(`Sites: ${totalSites}`);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await db.$disconnect();
  }
}

importBackup();