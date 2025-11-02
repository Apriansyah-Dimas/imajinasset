const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAsset() {
  try {
    const asset = await prisma.asset.findUnique({
      where: { noAsset: 'FA002/III/01' }
    })

    if (asset) {
      console.log('Asset found:')
      console.log('ID:', asset.id)
      console.log('Name:', asset.name)
      console.log('No Asset:', asset.noAsset)
      console.log('Status:', asset.status)
      console.log('PIC:', asset.pic)
      console.log('Updated At:', asset.updatedAt)
    } else {
      console.log('Asset FA002/III/01 not found')
    }

  } catch (error) {
    console.error('Error checking asset:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAsset()