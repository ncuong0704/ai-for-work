import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";

export interface Source {
  title: string;
  slug: string;
  url: string;
}
export function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
export function ensureSources(answer: string, sources: Source[]) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify);
  const tree = processor.parse(
    answer.split(/(?:\*\*)?Nguồn tham khảo\s*:?\s*(?:\*\*)?/i)[0],
  );
  interface Node {
    type: string;
    value?: string;
    alt?: string | null;
    children?: Node[];
  }
  function clean(node: Node): Node {
    if (node.type === "text" && node.value)
      node.value = node.value
        .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s<>()]+|www\.[^\s<>()]+/gi, "")
        .replace(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "");
    if (node.children)
      node.children = node.children.flatMap((child) => {
        if (child.type === "link" || child.type === "linkReference")
          return child.children?.map(clean) || [];
        if (child.type === "image" || child.type === "imageReference")
          return [clean({ type: "text", value: child.alt || "" })];
        if (child.type === "definition" || child.type === "html") return [];
        return [clean(child)];
      });
    return node;
  }
  clean(tree);
  const body = processor.stringify(tree).trim();
  const safeTitle = (title: string) => title.replace(/[\[\]\\\r\n]/g, " ");
  return `${body}\n\n**Nguồn tham khảo:**\n${sources.map((s) => `- [${safeTitle(s.title)}](/posts/${encodeURIComponent(s.slug)})`).join("\n")}`;
}
