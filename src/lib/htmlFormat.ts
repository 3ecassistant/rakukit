const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

export type IndentOption = "2" | "4" | "tab";

export interface FormatHtmlOptions {
  indent: IndentOption;
  removeComments: boolean;
  collapseSpaces: boolean;
}

function indentUnit(option: IndentOption): string {
  if (option === "tab") return "\t";
  return " ".repeat(Number(option));
}

function serializeAttrs(el: Element): string {
  return Array.from(el.attributes)
    .map((attr) => ` ${attr.name}="${attr.value}"`)
    .join("");
}

export function formatHtml(html: string, options: FormatHtmlOptions): string {
  if (typeof document === "undefined") return "";
  const unit = indentUnit(options.indent);
  const container = document.createElement("div");
  container.innerHTML = html;

  const lines: string[] = [];

  function walk(node: Node, depth: number) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        if (!options.removeComments) {
          lines.push(`${unit.repeat(depth)}<!--${child.textContent ?? ""}-->`);
        }
        return;
      }
      if (child.nodeType === Node.TEXT_NODE) {
        let text = child.textContent ?? "";
        if (options.collapseSpaces) text = text.replace(/[ \t]+/g, " ");
        const trimmed = text.trim();
        if (trimmed) lines.push(`${unit.repeat(depth)}${trimmed}`);
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      const attrs = serializeAttrs(el);

      if (VOID_ELEMENTS.has(tag)) {
        lines.push(`${unit.repeat(depth)}<${tag}${attrs}>`);
        return;
      }
      if (el.childNodes.length === 0) {
        lines.push(`${unit.repeat(depth)}<${tag}${attrs}></${tag}>`);
        return;
      }
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        const text = (el.childNodes[0].textContent ?? "").trim();
        lines.push(`${unit.repeat(depth)}<${tag}${attrs}>${text}</${tag}>`);
        return;
      }
      lines.push(`${unit.repeat(depth)}<${tag}${attrs}>`);
      walk(el, depth + 1);
      lines.push(`${unit.repeat(depth)}</${tag}>`);
    });
  }

  walk(container, 0);
  return lines.join("\n");
}
