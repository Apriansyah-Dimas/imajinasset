const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const names = require('./pic-names')

const generateBaseId = (name) => {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'PIC'
  const base = sanitized.slice(0, 6) || 'PIC'
  return `PIC-${base}`
}

const ensureUniqueEmployeeId = async (base) => {
  let attempt = base
  let counter = 1

  while (true) {
    const existing = await prisma.employee.findUnique({
      where: { employeeId: attempt },
    })

    if (!existing) return attempt

    const suffix = String(counter).padStart(2, '0')
    attempt = `${base}-${suffix}`
    counter += 1
  }
}

const run = async () => {
  const results = { created: 0, reactivated: 0, skipped: 0 }

  for (const name of names) {
    const existing = await prisma.employee.findFirst({
      where: { name },
    })

    if (existing) {
      if (!existing.isActive) {
        await prisma.employee.update({
          where: { id: existing.id },
          data: { isActive: true },
        })
        console.log(`Reactivated existing PIC: ${name}`)
        results.reactivated += 1
      } else {
        console.log(`PIC already exists, skipping: ${name}`)
        results.skipped += 1
      }
      continue
    }

    const employeeId = await ensureUniqueEmployeeId(generateBaseId(name))

    await prisma.employee.create({
      data: {
        employeeId,
        name,
        email: null,
        department: null,
        position: null,
        joinDate: null,
        isActive: true,
      },
    })

    console.log(`Added PIC: ${name} (${employeeId})`)
    results.created += 1
  }

  console.log('Done. Summary:', results)
}

run()
  .catch((error) => {
    console.error('Failed to add PIC list:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
