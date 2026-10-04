import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const EMAIL = "test@123";
const PASSWORD = "2509";
const FULL_NAME = "WHITEDEVIL ADMIN";

async function main() {
  console.log("Setting up WHITEDEVIL admin user...");

  try {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const userId = randomUUID();

    // Clean up if it already exists
    const existing = await prisma.authUser.findUnique({
      where: { email: EMAIL }
    });

    if (existing) {
      console.log("User already exists. Updating password...");
      await prisma.authUser.update({
        where: { email: EMAIL },
        data: { passwordHash }
      });
      console.log("Password updated successfully!");
    } else {
        console.log("Creating/Updating AuthUser...");
        await prisma.authUser.upsert({
            where: { email: EMAIL },
            update: { passwordHash, isActive: true },
            create: { userId, email: EMAIL, passwordHash, isActive: true },
        });
        
        console.log("Creating/Updating Profile...");
        await prisma.profile.upsert({
            where: { userId },
            update: { fullName: FULL_NAME, status: "active", kycStatus: "verified", isMasterAdmin: true },
            create: {
                userId,
                fullName: FULL_NAME,
                status: "active",
                kycStatus: "verified",
                isMasterAdmin: true,
            },
        });

        console.log("Creating UserRole...");
        await prisma.userRole.create({
            data: { userId, role: "admin" as any },
        });

        console.log("Creating StaffPermission...");
        await prisma.staffPermission.create({
            data: {
                userId,
                // Section Master Flags
                canManageUsers: true,
                canManageFinance: true,
                canManageCommissions: true,
                canManageServices: true,
                canManageSupport: true,
                // Users Sub-actions
                canCreateUsers: true,
                canEditUsers: true,
                canBlockUsers: true,
                canDeleteUsers: true,
                canManageUserServices: true,
                canChangeUserRoles: true,
                canResetUserPasswords: true,
                canViewUserDocs: true,
                // Finance Sub-actions
                canApproveFundRequests: true,
                canRejectFundRequests: true,
                canManageBankAccounts: true,
                canViewTransactions: true,
                canPerformWalletTransfer: true,
                // Others Sub-actions
                canManageGlobalServices: true,
                canManageSettings: true,
                canManageSecurity: true,
                canReplySupportTickets: true,
                canViewReports: true,
                grantedBy: userId,
            },
        });

        console.log("Creating Wallet...");
        await prisma.wallet.create({
            data: { userId, balance: 100000, eWalletBalance: 100000 },
        });
    }

    // Check test distributor
    const existingDist = await prisma.authUser.findUnique({ where: { email: "distributor" } });
    if (!existingDist) {
        console.log("Creating Test Distributor...");
        const distId = randomUUID();
        await prisma.authUser.create({
            data: { userId: distId, email: "distributor", passwordHash, isActive: true },
        });
        const distProfile = await prisma.profile.create({
            data: { userId: distId, fullName: "Test Distributor", status: "active", kycStatus: "verified", isMasterAdmin: false },
        });
        await prisma.userRole.create({
            data: { userId: distId, role: "distributor" as any },
        });
        await prisma.wallet.create({
            data: { userId: distId, balance: 50000, eWalletBalance: 0 },
        });

        console.log("Creating Test Retailer...");
        const retId = randomUUID();
        await prisma.authUser.create({
            data: { userId: retId, email: "retailer", passwordHash, isActive: true },
        });
        await prisma.profile.create({
            data: { userId: retId, fullName: "Test Retailer", status: "active", kycStatus: "verified", isMasterAdmin: false, parentId: distProfile.id },
        });
        await prisma.userRole.create({
            data: { userId: retId, role: "retailer" as any },
        });
        await prisma.wallet.create({
            data: { userId: retId, balance: 10000, eWalletBalance: 0 },
        });
    }

    console.log(`Admin account created successfully!`);
    console.log(`Username/Email: ${EMAIL}`);
    console.log(`Password: ${PASSWORD}`);
  } catch (error) {
    console.error("Error setting up admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
