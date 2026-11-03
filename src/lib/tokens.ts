import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32)
    throw new Error("JWT_SECRET phải có ít nhất 32 ký tự.");
  return new TextEncoder().encode(value);
}

export async function createToken(
  subject: string,
  scope: "admin" | "chat",
  lifetime = "12h",
) {
  return new SignJWT({ scope })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuer("ai-for-work")
    .setAudience(scope)
    .setIssuedAt()
    .setExpirationTime(lifetime)
    .sign(secret());
}

export async function verifyToken(
  token: string | undefined,
  scope: "admin" | "chat",
) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: "ai-for-work",
      audience: scope,
      algorithms: ["HS256"],
    });
    return payload.scope === scope && payload.sub ? payload : null;
  } catch {
    return null;
  }
}
