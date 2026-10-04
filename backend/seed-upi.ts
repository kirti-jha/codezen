import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.serviceConfig.upsert({
    where: { serviceKey: "upi_qr" },
    update: {
      serviceLabel: "UPI QR",
      routePath: "/dashboard/upi-qr",
      icon: "QrCode",
    },
    create: {
      serviceKey: "upi_qr",
      serviceLabel: "UPI QR",
      routePath: "/dashboard/upi-qr",
      icon: "QrCode",
      isEnabled: true,
    },
  });
  console.log("UPI QR Service Seeded.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
