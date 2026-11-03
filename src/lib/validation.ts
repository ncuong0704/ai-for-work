import { z } from "zod";
import { TONES, LENGTHS } from "./constants";

export const httpUrl = z
  .string()
  .url()
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), "Chỉ chấp nhận liên kết HTTP/HTTPS.");
const inlineText = z.object({
  type: z.literal("text"),
  text: z.string().max(100_000),
  styles: z.record(z.string(), z.union([z.boolean(), z.string()])).optional(),
});
const link = z.object({
  type: z.literal("link"),
  href: z
    .string()
    .max(2048)
    .refine(
      (v) =>
        /^https?:\/\//i.test(v) ||
        /^mailto:/i.test(v) ||
        /^\/(?!\/)/.test(v) ||
        v.startsWith("#"),
      "Liên kết không an toàn.",
    ),
  content: z.array(inlineText).max(1000),
});
const inline = z.union([
  z.string().max(150_000),
  z.array(z.union([inlineText, link])).max(5000),
]);
export type Inline = z.infer<typeof inline>;
export interface ContentBlock {
  id?: string;
  type:
    | "paragraph"
    | "heading"
    | "bulletListItem"
    | "numberedListItem"
    | "checkListItem"
    | "codeBlock"
    | "quote"
    | "image"
    | "table"
    | "divider"
    | "toggleListItem";
  props?: Record<string, string | number | boolean>;
  content?:
    | Inline
    | {
        type: "tableContent";
        rows: {
          cells: (
            | Inline
            | {
                type: "tableCell";
                content: Inline;
                props?: Record<string, unknown>;
              }
          )[];
        }[];
        columnWidths?: (number | null | undefined)[];
        headerRows?: number;
        headerCols?: number;
      };
  children?: ContentBlock[];
}
const tableCell = z.union([
  inline,
  z.object({
    type: z.literal("tableCell"),
    content: inline,
    props: z.record(z.string(), z.unknown()).optional(),
  }),
]);
const block: z.ZodType<ContentBlock> = z.lazy(() =>
  z.object({
    id: z.string().max(100).optional(),
    type: z.enum([
      "paragraph",
      "heading",
      "bulletListItem",
      "numberedListItem",
      "checkListItem",
      "codeBlock",
      "quote",
      "image",
      "table",
      "divider",
      "toggleListItem",
    ]),
    props: z
      .record(
        z.string(),
        z.union([z.string().max(2048), z.number(), z.boolean()]),
      )
      .optional(),
    content: z
      .union([
        inline,
        z.object({
          type: z.literal("tableContent"),
          rows: z
            .array(z.object({ cells: z.array(tableCell).max(30) }))
            .max(500),
          columnWidths: z.array(z.number().nullish()).optional(),
          headerRows: z.number().optional(),
          headerCols: z.number().optional(),
        }),
      ])
      .optional(),
    children: z.array(block).max(2000).optional(),
  }),
);
export const documentSchema = z
  .array(block)
  .min(1)
  .max(3000)
  .superRefine((blocks, ctx) => {
    let total = 0;
    function visit(items: ContentBlock[], depth: number) {
      if (depth > 12 || (total += items.length) > 5000) {
        ctx.addIssue({
          code: "custom",
          message: "Tài liệu quá nhiều cấp hoặc quá nhiều block.",
        });
        return;
      }
      for (const b of items) {
        if (
          b.type === "image" &&
          b.props?.url &&
          !httpUrl.safeParse(b.props.url).success
        )
          ctx.addIssue({
            code: "custom",
            message: "URL hình ảnh không hợp lệ.",
          });
        if (b.children) visit(b.children, depth + 1);
      }
    }
    visit(blocks, 0);
  });
export const postInputSchema = z.object({
  title: z.string().trim().min(3).max(250),
  summary: z.string().trim().max(1000).default(""),
  category: z.string().trim().min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  coverImage: z.union([httpUrl, z.literal("")]).default(""),
  contentJson: documentSchema,
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  updatedAt: z.string().datetime().optional(),
});
export const generationInputSchema = z.object({
  requestId: z.string().uuid(),
  topics: z.array(z.string().trim().min(3).max(300)).min(1).max(50),
  tone: z.enum(TONES).default(TONES[0]),
  length: z.enum(LENGTHS).default(LENGTHS[1]),
  hasImage: z.boolean().default(false),
});
export const generatedArticleSchema = z.object({
  title: z.string().trim().min(3).max(250),
  summary: z.string().trim().max(1000),
  category: z.string().trim().min(1).max(100),
  category_reason: z.string().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20),
  source_urls: z
    .array(z.object({ url: httpUrl, title: z.string().max(300) }))
    .max(30)
    .default([]),
  content_markdown: z.string().max(200_000).default(""),
});
export const chatInputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  sessionId: z.string().uuid().nullable().optional(),
});
export const topicInputSchema = z.object({
  title: z.string().trim().min(3).max(300),
  isActive: z.boolean().default(true),
});
