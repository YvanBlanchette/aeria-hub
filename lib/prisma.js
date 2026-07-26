import { PrismaClient } from "@/app/generated/prisma";

const globalForPrisma = globalThis;

function createPrismaClient() {
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
