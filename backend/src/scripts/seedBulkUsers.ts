import "dotenv/config";
import { PrismaClient, AppRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const ROLES = [
  AppRole.super_distributor,
  AppRole.master_distributor,
  AppRole.distributor,
  AppRole.retailer,
];

const DEFAULT_PASSWORD = "password123";

async function main() {
  console.log("Seeding bulk users...");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Find admin for hierarchy root
  const adminRole = await prisma.userRole.findFirst({
    where: { role: AppRole.admin },
  });

  let adminProfile = null;
  if (adminRole) {
    adminProfile = await prisma.profile.findUnique({
      where: { userId: adminRole.userId },
    });
  }

  const rootParentId = adminProfile?.id || null;

  for (const role of ROLES) {
    console.log(`Creating 10 users for role: ${role}...`);
    for (let i = 1; i <= 10; i++) {
      const email = `${role}_${i}@test.com`;
      const userId = randomUUID();
      
      try {
        await prisma.$transaction(async (tx) => {
          // 1. AuthUser
          await tx.authUser.upsert({
            where: { email },
            update: {},
            create: {
              userId,
              email,
              passwordHash,
              isActive: true,
            },
          });

          // 2. Profile
          await tx.profile.upsert({
            where: { userId },
            update: {},
            create: {
              userId,
              fullName: `${role.replace("_", " ").toUpperCase()} ${i}`,
              phone: `98765432${i.toString().padStart(2, "0")}`,
              businessName: `Test ${role} Business ${i}`,
              parentId: rootParentId,
              kycStatus: "approved",
            },
          });

          // 3. UserRole
          await tx.userRole.upsert({
            where: {
              userId_role: { userId, role },
            },
            update: {},
            create: {
              userId,
              role,
            },
          });

          // 4. Wallet
          await tx.wallet.upsert({
            where: { userId },
            update: {},
            create: {
              userId,
              balance: 1000.0,
              eWalletBalance: 500.0,
            },
          });
        });
        process.stdout.write(".");
      } catch (e: any) {
         console.error(`\nFailed for ${email}:`, e.message);
      }
    }
    console.log(`\nFinished ${role}\n`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Seeding complete.");
  });
