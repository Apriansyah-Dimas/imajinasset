import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@assetso.com" },
    update: {},
    create: {
      email: "admin@assetso.com",
      name: "Admin User",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("Created admin user:", adminUser.email);

  // Create sample sites
  const site1 = await prisma.site.upsert({
    where: { name: "Head Office" },
    update: {},
    create: {
      name: "Head Office",
      address: "Jl. Sudirman No. 1",
      city: "Jakarta",
      province: "DKI Jakarta",
      postalCode: "12345",
      country: "Indonesia",
      phone: "+62-21-1234567",
      email: "info@company.com",
    },
  });

  const site2 = await prisma.site.upsert({
    where: { name: "Branch Office" },
    update: {},
    create: {
      name: "Branch Office",
      address: "Jl. Gatot Subroto No. 10",
      city: "Surabaya",
      province: "Jawa Timur",
      postalCode: "60245",
      country: "Indonesia",
      phone: "+62-31-7654321",
      email: "branch@company.com",
    },
  });

  // Create sample categories
  const category1 = await prisma.category.upsert({
    where: { name: "Laptop" },
    update: {},
    create: {
      name: "Laptop",
      description: "Laptop computers and notebooks",
    },
  });

  const category2 = await prisma.category.upsert({
    where: { name: "Monitor" },
    update: {},
    create: {
      name: "Monitor",
      description: "Computer monitors and displays",
    },
  });

  // Create sample departments
  const dept1 = await prisma.department.upsert({
    where: { name: "IT Department" },
    update: {},
    create: {
      name: "IT Department",
      description: "Information Technology Department",
    },
  });

  const dept2 = await prisma.department.upsert({
    where: { name: "Finance Department" },
    update: {},
    create: {
      name: "Finance Department",
      description: "Finance and Accounting Department",
    },
  });

  // Create sample employees
  const emp1 = await prisma.employee.upsert({
    where: { employeeId: "EMP001" },
    update: {},
    create: {
      employeeId: "EMP001",
      name: "John Doe",
      email: "john.doe@company.com",
      department: "IT Department",
      position: "IT Manager",
      joinDate: new Date("2020-01-15"),
      isActive: true,
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: { employeeId: "EMP002" },
    update: {},
    create: {
      employeeId: "EMP002",
      name: "Jane Smith",
      email: "jane.smith@company.com",
      department: "Finance Department",
      position: "Finance Manager",
      joinDate: new Date("2019-03-20"),
      isActive: true,
    },
  });

  // Create sample assets
  const asset1 = await prisma.asset.upsert({
    where: { noAsset: "LAP001" },
    update: {},
    create: {
      name: "Dell Latitude 5420",
      noAsset: "LAP001",
      status: "Active",
      serialNo: "DL5420202101",
      purchaseDate: new Date("2021-01-15"),
      cost: 15000000,
      brand: "Dell",
      model: "Latitude 5420",
      siteId: site1.id,
      categoryId: category1.id,
      departmentId: dept1.id,
      picId: emp1.id,
      pic: "John Doe",
    },
  });

  const asset2 = await prisma.asset.upsert({
    where: { noAsset: "MON001" },
    update: {},
    create: {
      name: "LG 27UL850",
      noAsset: "MON001",
      status: "Active",
      serialNo: "LG27UL8502021",
      purchaseDate: new Date("2021-06-10"),
      cost: 8500000,
      brand: "LG",
      model: "27UL850",
      siteId: site2.id,
      categoryId: category2.id,
      departmentId: dept2.id,
      picId: emp2.id,
      pic: "Jane Smith",
    },
  });

  // Create sample SO session
  const soSession = await prisma.sOSession.create({
    data: {
      name: "SO 2024 Q1",
      year: 2024,
      description: "Stock Opname Q1 2024",
      status: "Active",
      totalAssets: 0,
      scannedAssets: 0,
    },
  });

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
