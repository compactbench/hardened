import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface TopAuthor {
  authorId: string;
  postCount: number;
}

export async function getTopAuthors(minPosts: number) {
  const rows = await prisma.$queryRaw<TopAuthor[]>`
    SELECT "authorId", COUNT(*)::int AS "postCount"
    FROM "Post"
    WHERE "published" = true
    GROUP BY "authorId"
    HAVING COUNT(*) >= ${minPosts}
    ORDER BY "postCount" DESC
  `;
  return rows;
}
