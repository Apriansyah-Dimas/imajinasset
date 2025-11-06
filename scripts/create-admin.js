const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Hash password
    const password = 'admin123'; // Default password, change in production
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: 'imajingeneralaffair@gmail.com',
        name: 'Admin IMAJIN',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`👤 Name: ${admin.name}`);
    console.log(`🔑 Role: ${admin.role}`);
    console.log(`🔐 Password: ${password} (change this in production!)`);

    // Create a sample SO Asset User
    const soAssetUser = await prisma.user.create({
      data: {
        email: 'so@assetso.com',
        name: 'SO Asset User',
        password: await bcrypt.hash('so123', 12),
        role: 'SO_ASSET_USER',
        isActive: true,
        createdBy: admin.id
      }
    });

    console.log('\n✅ SO Asset User created successfully!');
    console.log(`📧 Email: ${soAssetUser.email}`);
    console.log(`👤 Name: ${soAssetUser.name}`);
    console.log(`🔑 Role: ${soAssetUser.role}`);
    console.log(`🔐 Password: so123`);

    // Create a sample Viewer User
    const viewerUser = await prisma.user.create({
      data: {
        email: 'viewer@assetso.com',
        name: 'Viewer User',
        password: await bcrypt.hash('viewer123', 12),
        role: 'VIEWER',
        isActive: true,
        createdBy: admin.id
      }
    });

    console.log('\n✅ Viewer User created successfully!');
    console.log(`📧 Email: ${viewerUser.email}`);
    console.log(`👤 Name: ${viewerUser.name}`);
    console.log(`🔑 Role: ${viewerUser.role}`);
    console.log(`🔐 Password: viewer123`);

    console.log('\n🎉 All sample users created successfully!');
    console.log('📝 Login credentials saved - please change passwords in production');

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();