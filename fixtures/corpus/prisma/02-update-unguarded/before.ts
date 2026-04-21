import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function publishPost(id: string, title: string, body: string) {
  const post = await prisma.post.update({
    where: { id },
    data: {
      title,
      body,
      published: true,
      publishedAt: new Date(),
    },
  });
  return post;
}
