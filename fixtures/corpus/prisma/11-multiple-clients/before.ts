import { PrismaClient } from "@prisma/client";

const primary = new PrismaClient();
const replica = new PrismaClient();

export async function loadUsers() {
  const active = await primary.user.findMany({ where: { active: true } });
  const archived = await replica.user.findMany({ where: { active: false } });
  return { active, archived };
}
