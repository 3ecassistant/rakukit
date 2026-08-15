const MAX_KEYWORD_LENGTH = 100;

function stripControlChars(input: string): string {
  return Array.from(input)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return !(code <= 0x1f || code === 0x7f);
    })
    .join("");
}

export function sanitizeKeyword(raw: string | null | undefined): string {
  if (!raw) return "";
  const withoutNewlines = raw.replace(/\r\n|\r|\n|\t/g, " ");
  const withoutControl = stripControlChars(withoutNewlines);
  return withoutControl.trim().slice(0, MAX_KEYWORD_LENGTH);
}

export { MAX_KEYWORD_LENGTH };
