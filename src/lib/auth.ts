import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { verifyToken } from "./tokens";
import { HttpError } from "./http";

export async function currentAdmin() {
  const payload = await verifyToken(
    (await cookies()).get("afw_admin")?.value,
    "admin",
  );
  return payload
    ? prisma.admin.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true },
      })
    : null;
}
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) throw new HttpError(401, "Vui lòng đăng nhập quản trị.");
  return admin;
}
