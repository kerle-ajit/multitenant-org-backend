import { prisma } from "../config/db";

async function testDB() {
  const tenants = await prisma.tenant.findMany();
  console.log("Tenants:", tenants);
}

testDB()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });