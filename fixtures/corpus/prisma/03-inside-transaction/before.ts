import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function createPostAndBumpAuthor(authorId: string, title: string, body: string) {
  const [updatedAuthor, newPost] = await prisma.$transaction([
    prisma.user.update({
      where: { id: authorId },
      data: { postCount: { increment: 1 } },
    }),
    prisma.post.create({
      data: {
        title,
        body,
        authorId,
      },
    }),
  ]);
  return { updatedAuthor, newPost };
}
