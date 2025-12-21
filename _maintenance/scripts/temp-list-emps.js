const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.employee.findMany({ select: { id: true, name: true, isActive: true }, orderBy: { name: 'asc' } });
  console.log('count', rows.length);
  console.log(rows.map(r => `${r.name} [${r.isActive}]`).join('\n'));
  await prisma.$disconnect();
})();
