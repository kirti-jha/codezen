import "dotenv/config";
import { PrismaClient, AppRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "password123";

async function main() {
  console.log("Seeding mock data for charts and users...");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Get admin to set as parent
  const adminRole = await prisma.userRole.findFirst({ where: { role: AppRole.admin } });
  const rootParentId = adminRole ? (await prisma.profile.findUnique({ where: { userId: adminRole.userId } }))?.id : null;

  const rolesToCreate = [
    { role: AppRole.super_distributor, count: 5 },
    { role: AppRole.master_distributor, count: 8 },
    { role: AppRole.distributor, count: 12 },
    { role: AppRole.retailer, count: 25 },
  ];

  let createdUsers = [];

  for (const { role, count } of rolesToCreate) {
    console.log(`Seeding ${count} users for ${role}...`);
    for (let i = 1; i <= count; i++) {
      const email = `${role}_new_${i}@test.com`;
      const userId = randomUUID();
      try {
        await prisma.authUser.create({ data: { userId, email, passwordHash, isActive: true } });
        await prisma.profile.create({
          data: {
            userId,
            fullName: `${role.replace("_", " ").toUpperCase()} ${i}`,
            phone: `99999${i.toString().padStart(5, "0")}`,
            parentId: rootParentId,
            kycStatus: "approved",
          },
        });
        await prisma.userRole.create({ data: { userId, role } });
        await prisma.wallet.create({ data: { userId, balance: 15000, eWalletBalance: 5000 } });
        createdUsers.push(userId);
      } catch (err) {
        // Ignore unique constraint errors
      }
    }
  }

  // Seed 100 random transactions over the last 7 days
  console.log("Seeding transactions...");
  const services = ["aeps", "bbps", "remittance", "recharge"];
  for (let i = 0; i < 100; i++) {
    const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)] || adminRole?.userId;
    if (!randomUser) break;

    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const amount = Math.floor(Math.random() * 10000) + 100;
    const isSuccess = Math.random() > 0.1;

    try {
        const txn = await prisma.transaction.create({
            data: {
                userId: randomUser,
                serviceType: services[Math.floor(Math.random() * services.length)],
                amount,
                status: isSuccess ? "success" : "failed",
                clientRefId: `TXN${randomUUID().substring(0,8).toUpperCase()}`,
                createdAt: date,
            }
        });

        if (isSuccess) {
            await prisma.commissionLog.create({
                data: {
                    userId: randomUser,
                    serviceKey: txn.serviceType,
                    transactionAmount: amount,
                    commissionType: "flat",
                    commissionValue: 10,
                    commissionAmount: amount * 0.02,
                    credited: true,
                    createdAt: date,
                }
            });
        }
    } catch(e) {}
  }

  console.log("Done seeding data!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
