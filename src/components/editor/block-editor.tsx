"use client";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  type PartialBlock,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import type { ContentBlock } from "@/lib/validation";

const { audio, video, file, ...supportedBlocks } = defaultBlockSpecs;
const schema = BlockNoteSchema.create({ blockSpecs: supportedBlocks });
function normalizeTables(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((block) => ({
    ...block,
    ...(block.content &&
    typeof block.content === "object" &&
    !Array.isArray(block.content) &&
    block.content.columnWidths
      ? {
          content: {
            ...block.content,
            columnWidths: block.content.columnWidths.map(
              (width) => width ?? undefined,
            ),
          },
        }
      : {}),
    ...(block.children ? { children: normalizeTables(block.children) } : {}),
  }));
}

export default function BlockEditor({
  initial,
  onChange,
}: {
  initial: ContentBlock[];
  onChange: (document: ContentBlock[]) => void;
}) {
  const editor = useCreateBlockNote({
    schema,
    initialContent: normalizeTables(initial) as PartialBlock<
      typeof schema.blockSchema
    >[],
    uploadFile: undefined,
  });
  return (
    <BlockNoteView
      editor={editor}
      theme="dark"
      onChange={() => onChange(editor.document as unknown as ContentBlock[])}
    />
  );
}
