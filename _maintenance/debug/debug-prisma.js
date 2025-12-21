const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  try {
    const res = await db.asset.findMany({ take: 1 });
    console.log('count', res.length);
  } catch (err) {
    console.error(err);
  } finally {
    await db.$disconnect();
  }
})();
