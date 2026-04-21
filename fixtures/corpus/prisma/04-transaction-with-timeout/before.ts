import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function transferCredits(fromUserId: string, toUserId: string, credits: number) {
  const result = await prisma.$transaction(
    [
      prisma.user.update({
        where: { id: fromUserId },
        data: { credits: { decrement: credits } },
      }),
      prisma.user.update({
        where: { id: toUserId },
        data: { credits: { increment: credits } },
      }),
      prisma.creditTransfer.create({
        data: { fromUserId, toUserId, amount: credits },
      }),
    ],
    { timeout: 10000 }
  );
  return result;
}
