const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const names = [
  'Chendy Martika Jaya',
  'Joseline Olivia',
  'Stefanus Hodir',
  'Shela Oktania',
  'Adi Kusumah',
  'Rispandi Mandala Putra',
  'Fitria',
  'Corneleo Dimas Yulendra Wasisto',
  'Harmoko',
  'Melisa Aprilia',
  'Rubi Anggoro',
  'Agus Rianto Harjono',
  'Felix Firmansyah',
  'Gilbert Bagas Sadewo',
  'Hari Tri Mukti',
  'Arina Khujjatul Khaq',
  'Ranti Veronika Sidauruk',
  'Diki Darmawan',
  'Fattah Juliandoko',
  "Muhamad Rino Rifa'i",
  'Rifky Fauzi',
  'Khrisna Rizky Meilarani',
  'Gedeon Enggar Satrio',
  'Bilkis Ismail',
  'Hendra Nur Solichin',
  'Audrey',
  'Marcel',
  'Joko Prihono',
  'Adelia Putri Ariansyah',
  'Herfian Pradityo',
  'Yogie Alfath',
  'Devi Erliani',
  'Muhamad Apriansyah Dimas Saputra',
  'Cokyat Christian',
  'Andi Aprian',
  'Eka Puteri Shelayanti',
  'Siska Kusmayanti',
  'Daniella Vannesa Chrissant Putri',
  'Alvin Julianto Liaunardi',
  'Gabriella Magdalena',
  'Carissa Christybella Wijaya',
  'Atina Balqis Izza',
  'Lanang Fajar Nugroho Budianto',
  'Rafida Afnan Azizi',
  'Iyan Hardiyansyah',
  'Bayu Sidik',
  'Diansyah',
  "Muhammad Ja'i",
  'Nana Supriatna',
  'Priyadi',
  'Reza Sidqiaturohman',
  'Syaiful Eko Nurrohman',
  'Iwat',
  'Samsudin',
  'Ardiansyah',
  'Tegar Terthio Putra',
  'Lut Fatul Amanah',
  'Gilang Rizki Ramadhan',
  'Silmi Khoiriyah',
  'Alif Imanianto',
]

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
