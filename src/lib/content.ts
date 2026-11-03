import type { ContentBlock, Inline } from "./validation";

function escapeMarkdown(text: string) {
  return text.replace(/([\\`*_[\]<>#|~!()+.{}-])/g, "\\$1");
}

function plainInline(content: ContentBlock["content"]): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) =>
      item.type === "link"
        ? item.content.map((t) => t.text).join("")
        : item.text,
    )
    .join("");
}

function inlineMarkdown(content: ContentBlock["content"]): string {
  if (!content) return "";
  if (typeof content === "string") return escapeMarkdown(content);
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (item.type === "link")
        return `[${inlineMarkdown(item.content)}](${item.href.replace(/[()\s]/g, encodeURIComponent)})`;
      let text = escapeMarkdown(item.text);
      if (item.styles?.code) {
        const fence = item.text.includes("`") ? "``" : "`";
        return `${fence} ${item.text} ${fence}`;
      }
      if (item.styles?.bold) text = `**${text}**`;
      if (item.styles?.italic) text = `*${text}*`;
      if (item.styles?.strike) text = `~~${text}~~`;
      return text;
    })
    .join("");
}

export function blocksToMarkdown(blocks: ContentBlock[], depth = 0): string {
  let numbered = 0;
  return blocks
    .map((block) => {
      const text = inlineMarkdown(block.content);
      const indent = "  ".repeat(depth);
      let result = "";
      switch (block.type) {
        case "heading":
          result = `${"#".repeat(Math.min(6, Math.max(1, Number(block.props?.level) || 2)))} ${text}`;
          break;
        case "bulletListItem":
        case "toggleListItem":
          result = `${indent}- ${text}`;
          break;
        case "numberedListItem":
          result = `${indent}${++numbered}. ${text}`;
          break;
        case "checkListItem":
          result = `${indent}- [${block.props?.checked ? "x" : " "}] ${text}`;
          break;
        case "quote":
          result = text
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n");
          break;
        case "divider":
          result = "---";
          break;
        case "codeBlock": {
          const code = plainInline(block.content);
          const fence = "`".repeat(
            Math.max(
              3,
              ...[...code.matchAll(/`+/g)].map((m) => m[0].length + 1),
            ),
          );
          result = `${fence}${String(block.props?.language || "").replace(/[^a-z0-9+-]/gi, "")}\n${code}\n${fence}`;
          break;
        }
        case "image": {
          const url = String(block.props?.url || "");
          if (/^https?:\/\//i.test(url))
            result = `![${String(block.props?.caption || block.props?.name || "Hình minh họa").replace(/[\[\]]/g, "")}](${url.replace(/[()\s]/g, encodeURIComponent)})`;
          break;
        }
        case "table": {
          if (
            block.content &&
            typeof block.content === "object" &&
            !Array.isArray(block.content) &&
            "rows" in block.content
          ) {
            const rows = block.content.rows.map(
              (row) =>
                `| ${row.cells
                  .map((cell) =>
                    inlineMarkdown(
                      typeof cell === "object" &&
                        !Array.isArray(cell) &&
                        "type" in cell
                        ? cell.content
                        : cell,
                    )
                      .replace(/(?<!\\)\|/g, "\\|")
                      .replace(/\n/g, " "),
                  )
                  .join(" | ")} |`,
            );
            const count = block.content.rows[0]?.cells.length || 1;
            rows.splice(1, 0, `| ${Array(count).fill("---").join(" | ")} |`);
            result = rows.join("\n");
          }
          break;
        }
        default:
          result = text;
      }
      if (block.type !== "numberedListItem") numbered = 0;
      if (block.children?.length)
        result += `\n${blocksToMarkdown(block.children, depth + 1)}`;
      return result;
    })
    .join("\n\n");
}

function parseInline(text: string): Inline {
  const parts: Exclude<Inline, string> = [];
  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/(?!\/)[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|~~([^~]+)~~|\*([^*]+)\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > cursor)
      parts.push({
        type: "text",
        text: text.slice(cursor, match.index),
        styles: {},
      });
    if (match[1])
      parts.push({
        type: "link",
        href: match[2],
        content: [{ type: "text", text: match[1], styles: {} }],
      });
    else
      parts.push({
        type: "text",
        text: match[3] || match[4] || match[5] || match[6],
        styles: match[3]
          ? { bold: true }
          : match[4]
            ? { code: true }
            : match[5]
              ? { strike: true }
              : { italic: true },
      });
    cursor = match.index! + match[0].length;
  }
  if (cursor < text.length)
    parts.push({ type: "text", text: text.slice(cursor), styles: {} });
  return parts.length ? parts : [{ type: "text", text, styles: {} }];
}

export function markdownToBlocks(markdown: string): ContentBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ContentBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const fence = line.match(/^\s*(`{3,}|~{3,})(\S*)/);
    if (fence) {
      const code: string[] = [];
      while (++i < lines.length && !lines[i].trim().startsWith(fence[1]))
        code.push(lines[i]);
      blocks.push({
        type: "codeBlock",
        props: { language: fence[2] || "text" },
        content: [{ type: "text", text: code.join("\n"), styles: {} }],
      });
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)/);
    if (heading) {
      blocks.push({
        type: "heading",
        props: { level: heading[1].length },
        content: parseInline(heading[2]),
      });
      continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);
    if (image) {
      blocks.push({
        type: "image",
        props: { url: image[2], caption: image[1], name: image[1] },
      });
      continue;
    }
    if (/^\s*([-*_])\1\1+\s*$/.test(line)) {
      blocks.push({ type: "divider" });
      continue;
    }
    if (line.includes("|") && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || "")) {
      const cells = (s: string) =>
        s
          .trim()
          .replace(/^\||\|$/g, "")
          .split(/(?<!\\)\|/)
          .map((c) => parseInline(c.trim()));
      const rows = [{ cells: cells(line) }];
      i += 2;
      for (; i < lines.length && lines[i].includes("|"); i++)
        rows.push({ cells: cells(lines[i]) });
      i--;
      blocks.push({
        type: "table",
        content: { type: "tableContent", headerRows: 1, rows },
      });
      continue;
    }
    const list = line.match(
      /^(\s*)(?:([-+*])|(\d+)\.)\s+(?:\[([ xX])\]\s+)?(.+)/,
    );
    if (list) {
      const block: ContentBlock = {
        type:
          list[4] !== undefined
            ? "checkListItem"
            : list[3]
              ? "numberedListItem"
              : "bulletListItem",
        content: parseInline(list[5]),
        ...(list[4] !== undefined
          ? { props: { checked: list[4].toLowerCase() === "x" } }
          : {}),
      };
      if (list[1].length && blocks.length) {
        const parent = blocks[blocks.length - 1];
        (parent.children ??= []).push(block);
      } else blocks.push(block);
      continue;
    }
    if (/^>\s?/.test(line)) {
      blocks.push({
        type: "quote",
        content: parseInline(line.replace(/^>\s?/, "")),
      });
      continue;
    }
    const paragraph = [line];
    while (
      i + 1 < lines.length &&
      lines[i + 1].trim() &&
      !/^(#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|>|```|~~~|!\[)/.test(lines[i + 1])
    )
      paragraph.push(lines[++i]);
    blocks.push({
      type: "paragraph",
      content: parseInline(paragraph.join("\n")),
    });
  }
  return blocks.length ? blocks : [{ type: "paragraph", content: [] }];
}

export function getHeadings(
  blocks: ContentBlock[],
): { text: string; level: number }[] {
  return blocks.flatMap((block) => [
    ...(block.type === "heading"
      ? [
          {
            text: plainInline(block.content),
            level: Number(block.props?.level) || 2,
          },
        ]
      : []),
    ...(block.children ? getHeadings(block.children) : []),
  ]);
}
