import { prisma } from "./prisma";
import { encryptSecret, decryptSecret } from "./crypto";
import { DEFAULT_CATEGORIES, GROQ_MODELS } from "./constants";
import { HttpError } from "./http";

export async function getCategories(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: "categories" } });
  return row ? JSON.parse(row.value) : [...DEFAULT_CATEGORIES];
}

export async function publicSettings() {
  const rows = Object.fromEntries(
    (await prisma.setting.findMany()).map((s) => [s.key, s.value]),
  );
  return {
    groqConfigured: Boolean(rows.groqKey),
    groqWritingModel: rows.groqWritingModel || GROQ_MODELS[0],
    groqChatModel: rows.groqChatModel || GROQ_MODELS[0],
  };
}

export async function getProvider(purpose: "writing" | "chat") {
  const modelKey = purpose === "chat" ? "groqChatModel" : "groqWritingModel";
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["groqKey", modelKey] } },
  });
  const key = rows.find((s) => s.key === "groqKey")?.value;
  if (!key) throw new HttpError(503, "Chưa cấu hình API key Groq trong Settings.");
  return {
    key: decryptSecret(key),
    model: rows.find((s) => s.key === modelKey)?.value || GROQ_MODELS[0],
  };
}

export async function saveSettings(values: Record<string, string>) {
  const entries = Object.entries(values).filter(
    ([k, v]) => !k.endsWith("Key") || v.trim(),
  );
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: {
          key,
          value: key.endsWith("Key") ? encryptSecret(value.trim()) : value,
        },
        update: {
          value: key.endsWith("Key") ? encryptSecret(value.trim()) : value,
        },
      }),
    ),
  );
}
