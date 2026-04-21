import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function publishPost(id: string) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.update({
      where: { id },
      data: { published: true },
    });
    return post;
  });
}
