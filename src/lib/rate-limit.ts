import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { HttpError } from "./http";

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const hashed = createHash("sha256").update(key).digest("hex");
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${hashed}, 1, NOW() + ${windowSeconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN NOW() + ${windowSeconds} * INTERVAL '1 second' ELSE "RateLimit"."expiresAt" END
    RETURNING "count"`;
  if (rows[0].count > limit)
    throw new HttpError(
      429,
      "Bạn thao tác hơi nhanh. Vui lòng đợi một lát rồi thử lại.",
    );
}

export function requestIp(request: Request) {
  // Trust proxy IP headers only when the deployment proxy overwrites them.
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}
