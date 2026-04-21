import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function loadLongRunningReport() {
  // hardened-ignore-next-line
  return prisma.report.findMany({ where: { status: "ready" } });
}
