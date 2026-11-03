import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { retrieveChunks } from "./search";
import { getProvider } from "./settings";
import { answerFromContext, NO_CONTEXT } from "./ai/groq";
import { HttpError } from "./http";

export async function chat(sessionId: string, message: string) {
  const locked = await prisma.chatSession.updateMany({
    where: {
      id: sessionId,
      OR: [{ busyUntil: null }, { busyUntil: { lt: new Date() } }],
    },
    data: { busyUntil: new Date(Date.now() + 90_000) },
  });
  if (!locked.count)
    throw new HttpError(
      409,
      "Hội thoại đang có câu hỏi được xử lý. Vui lòng đợi.",
    );
  try {
    const recent = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    const history = recent.reverse();
    const previousQuestion = [...history]
      .reverse()
      .find((m) => m.role === "user")?.content;
    const followUp = previousQuestion && message.split(/\s+/).length <= 12;
    let chunks = await retrieveChunks(
      followUp ? `${previousQuestion} ${message}` : message,
    );
    if (!chunks.length && history.length) {
      const lastQuestion = [...history]
        .reverse()
        .find((m) => m.role === "user");
      if (lastQuestion)
        chunks = await retrieveChunks(`${lastQuestion.content} ${message}`);
    }
    const content = chunks.length
      ? await answerFromContext(
          await getProvider("chat"),
          message,
          history,
          chunks,
        )
      : NO_CONTEXT;
    const sources = [
      ...new Map(
        chunks.map((c) => [
          c.slug,
          { title: c.title, slug: c.slug, url: c.url },
        ]),
      ).values(),
    ];
    const answer = await prisma.$transaction(async (tx) => {
      await tx.chatMessage.create({
        data: {
          sessionId,
          role: "user",
          content: message,
          createdAt: new Date(),
        },
      });
      const result = await tx.chatMessage.create({
        data: {
          sessionId,
          role: "assistant",
          content,
          sources: sources as Prisma.InputJsonValue,
          createdAt: new Date(Date.now() + 1),
        },
      });
      const keep = await tx.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
        take: 16,
        select: { id: true },
      });
      await tx.chatMessage.deleteMany({
        where: { sessionId, id: { notIn: keep.map((m) => m.id) } },
      });
      return result;
    });
    return answer;
  } finally {
    await prisma.chatSession.updateMany({
      where: { id: sessionId },
      data: { busyUntil: null },
    });
  }
}
