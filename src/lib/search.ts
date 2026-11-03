import { prisma } from "./prisma";
import { normalizeSearch, type Source } from "./rag";

export interface SearchChunk extends Source {
  content: string;
  rank: number;
}

export async function retrieveChunks(question: string): Promise<SearchChunk[]> {
  const query = normalizeSearch(question)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 40)
    .join(" | ");
  if (!query) return [];
  // ts_rank is PostgreSQL lexical ranking (BM25-style retrieval, no embeddings).
  const rows = await prisma.$queryRaw<
    { content: string; title: string; slug: string; rank: number }[]
  >`
    SELECT c."content", p."title", p."slug", ts_rank(c.search_vector, to_tsquery('simple', ${query})) AS rank
    FROM "PostChunk" c JOIN "Post" p ON p."id" = c."postId"
    WHERE p."status" = 'PUBLISHED' AND c.search_vector @@ to_tsquery('simple', ${query})
    ORDER BY rank DESC, c."chunkIndex" ASC LIMIT 6`;
  return rows.map((row) => ({ ...row, url: `/posts/${row.slug}` }));
}
