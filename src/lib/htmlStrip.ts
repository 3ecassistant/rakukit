export interface StripHtmlOptions {
  brToNewline: boolean;
  pNewline: boolean;
  liNewline: boolean;
  keepLinkUrls: boolean;
  keepImageUrls: boolean;
}

export function stripHtml(html: string, options: StripHtmlOptions): string {
  if (typeof document === "undefined") return "";
  const container = document.createElement("div");
  container.innerHTML = html;

  let out = "";

  function walk(node: Node) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent ?? "";
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (tag === "br") {
        if (options.brToNewline) out += "\n";
        return;
      }
      if (tag === "img") {
        if (options.keepImageUrls) {
          const src = el.getAttribute("src");
          if (src) out += src;
        }
        return;
      }
      if (tag === "script" || tag === "style") {
        return;
      }

      walk(el);

      if (tag === "a" && options.keepLinkUrls) {
        const href = el.getAttribute("href");
        if (href) out += `(${href})`;
      }
      if (tag === "p" && options.pNewline) out += "\n";
      if (tag === "li" && options.liNewline) out += "\n";
    });
  }

  walk(container);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
