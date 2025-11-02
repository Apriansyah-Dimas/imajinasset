const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAllUsers() {
  try {
    console.log('🔄 Creating all user roles...')

    // Clean up all existing users
    console.log('🧹 Cleaning up existing users...')
    await prisma.user.deleteMany()
    console.log('✅ Existing users cleaned up')

    // Create Admin User
    console.log('\n👑 Creating Admin User...')
    const adminPassword = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@assetso.com',
        name: 'System Administrator',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true
      }
    })
    console.log('✅ Admin User created:')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Password: admin123`)
    console.log(`   Role: ${admin.role}`)

    // Create SO Asset User
    console.log('\n🔍 Creating SO Asset User...')
    const soAssetPassword = await bcrypt.hash('soasset123', 10)
    const soAsset = await prisma.user.create({
      data: {
        email: 'soasset@assetso.com',
        name: 'SO Asset Scanner',
        password: soAssetPassword,
        role: 'SO_ASSET_USER',
        isActive: true
      }
    })
    console.log('✅ SO Asset User created:')
    console.log(`   Email: ${soAsset.email}`)
    console.log(`   Password: soasset123`)
    console.log(`   Role: ${soAsset.role}`)

    // Create Viewer User
    console.log('\n👁 Creating Viewer User...')
    const viewerPassword = await bcrypt.hash('viewer123', 10)
    const viewer = await prisma.user.create({
      data: {
        email: 'viewer@assetso.com',
        name: 'Asset Viewer',
        password: viewerPassword,
        role: 'VIEWER',
        isActive: true
      }
    })
    console.log('✅ Viewer User created:')
    console.log(`   Email: ${viewer.email}`)
    console.log(`   Password: viewer123`)
    console.log(`   Role: ${viewer.role}`)

    // Summary
    console.log('\n📊 All Users Created Successfully!')
    console.log('='.repeat(50))
    console.log('👑 ADMIN     - admin@assetso.com     (admin123)')
    console.log('🔍 SO_ASSET  - soasset@assetso.com   (soasset123)')
    console.log('👁 VIEWER    - viewer@assetso.com    (viewer123)')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Error creating users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAllUsers()