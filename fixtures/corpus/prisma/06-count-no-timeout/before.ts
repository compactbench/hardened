import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function countUsers() {
  return prisma.user.count();
}
