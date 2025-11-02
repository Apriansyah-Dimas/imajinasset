const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupCompletedSessions() {
  try {
    console.log('Starting cleanup of completed sessions...')

    // Find all completed sessions
    const completedSessions = await prisma.sOSession.findMany({
      where: { status: 'Completed' },
      select: { id: true, name: true, status: true, scannedAssets: true }
    })

    console.log(`Found ${completedSessions.length} completed sessions:`)
    completedSessions.forEach(session => {
      console.log(`- ${session.name} (${session.id}) - ${session.scannedAssets} scanned assets`)
    })

    if (completedSessions.length === 0) {
      console.log('No completed sessions found. Nothing to cleanup.')
      return
    }

    // Delete SO Asset Entries for completed sessions
    const sessionIds = completedSessions.map(s => s.id)
    const deletedEntries = await prisma.sOAssetEntry.deleteMany({
      where: {
        soSessionId: {
          in: sessionIds
        }
      }
    })

    console.log(`Deleted ${deletedEntries.count} SO Asset Entries`)

    // Delete the completed sessions
    const deletedSessions = await prisma.sOSession.deleteMany({
      where: {
        id: {
          in: sessionIds
        }
      }
    })

    console.log(`Deleted ${deletedSessions.count} completed sessions`)

    // Verify remaining sessions
    const remainingSessions = await prisma.sOSession.findMany({
      select: { id: true, name: true, status: true }
    })

    console.log('\nRemaining sessions:')
    remainingSessions.forEach(session => {
      console.log(`- ${session.name} (${session.status})`)
    })

  } catch (error) {
    console.error('Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupCompletedSessions()