const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const res = await prisma.employee.updateMany({ data: { isActive: true } });
  console.log(res);
  await prisma.$disconnect();
})();
