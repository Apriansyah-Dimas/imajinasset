const { PrismaClient } = require('@prisma/client');

async function testSortOrder() {
  console.log('Testing sortOrder functionality...');

  try {
    // Use the same database URL as the app
    const DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: DATABASE_URL
        }
      }
    });
    
    // Test sites
    console.log('\n=== Testing Sites ===');
    const sites = await prisma.site.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    console.log(`Found ${sites.length} sites`);
    if (sites.length > 0) {
      console.log('Sample site structure:', Object.keys(sites[0]));
      console.log('First site:', sites[0]);
    }
    
    // Test categories
    console.log('\n=== Testing Categories ===');
    const categories = await prisma.category.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    console.log(`Found ${categories.length} categories`);
    if (categories.length > 0) {
      console.log('Sample category structure:', Object.keys(categories[0]));
      console.log('First category:', categories[0]);
    }
    
    // Test departments
    console.log('\n=== Testing Departments ===');
    const departments = await prisma.department.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    console.log(`Found ${departments.length} departments`);
    if (departments.length > 0) {
      console.log('Sample department structure:', Object.keys(departments[0]));
      console.log('First department:', departments[0]);
    }
    
    await prisma.$disconnect();
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during test:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
  }
}

testSortOrder();