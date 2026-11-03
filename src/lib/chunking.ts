import { getEncoding } from "js-tiktoken";

let encoding: ReturnType<typeof getEncoding> | undefined;
function tokenizer() {
  return (encoding ??= getEncoding("cl100k_base"));
}
export function tokenCount(text: string) {
  return tokenizer().encode(text).length;
}

const SEPARATORS = ["\n\n", "\n", ". ", " "];

function safePrefix(text: string, limit: number) {
  // Only tokenize a bounded window instead of re-tokenizing the remaining article.
  const window = text.slice(0, 4096).replace(/[\uD800-\uDBFF]$/, "");
  const tokens = tokenizer().encode(window);
  let end = Math.min(limit, tokens.length);
  let prefix = tokenizer().decode(tokens.slice(0, end));
  // A tokenizer boundary can bisect a Vietnamese character or emoji.
  while (prefix.includes("�") && end > 0)
    prefix = tokenizer().decode(tokens.slice(0, --end));
  while (tokenCount(prefix) > limit)
    prefix = Array.from(prefix).slice(0, -1).join("");
  return prefix;
}

function suffixOverlap(text: string, limit: number) {
  const tokens = tokenizer().encode(text);
  let start = Math.max(0, tokens.length - limit);
  let suffix = tokenizer().decode(tokens.slice(start));
  while (
    (suffix.includes("�") || tokenCount(suffix) > limit) &&
    start < tokens.length
  )
    suffix = tokenizer().decode(tokens.slice(++start));
  return suffix;
}

function recursiveBoundary(prefix: string, separatorIndex = 0): string {
  if (separatorIndex >= SEPARATORS.length) return prefix;
  const separator = SEPARATORS[separatorIndex];
  const at = prefix.lastIndexOf(separator);
  if (at >= prefix.length / 3) return prefix.slice(0, at + separator.length);
  return recursiveBoundary(prefix, separatorIndex + 1);
}

export function chunkText(text: string): string[] {
  let remaining = text.trim();
  if (!remaining) return [];
  const chunks: string[] = [];
  while (remaining) {
    const prefix = safePrefix(remaining, 512);
    if (prefix === remaining) {
      chunks.push(remaining);
      break;
    }
    const chunk = recursiveBoundary(prefix);
    if (!chunk) throw new Error("Không thể tách nội dung thành chunk.");
    chunks.push(chunk);
    remaining = suffixOverlap(chunk, 50) + remaining.slice(chunk.length);
  }
  return chunks;
}
