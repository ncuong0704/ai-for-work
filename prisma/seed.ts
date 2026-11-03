import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/crypto";
import { DEFAULT_CATEGORIES } from "../src/lib/constants";

const db = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !email.includes("@") || !password || password.length < 12)
    throw new Error(
      "Đặt ADMIN_EMAIL và ADMIN_PASSWORD (ít nhất 12 ký tự) trước khi seed.",
    );
  const existing = await db.admin.findFirst();
  if (!existing)
    await db.admin.create({
      data: { id: "admin", email, passwordHash: await hashPassword(password) },
    });
  else console.info("Admin đã tồn tại; seed không thay đổi mật khẩu.");
  await db.setting.upsert({
    where: { key: "categories" },
    update: {},
    create: { key: "categories", value: JSON.stringify(DEFAULT_CATEGORIES) },
  });
  console.info("Đã khởi tạo admin và chuyên mục.");
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
