import Encoding from "encoding-japanese";

export type CharCategory =
  | "zenkaku_hiragana"
  | "zenkaku_katakana"
  | "hankaku_katakana"
  | "zenkaku_alpha"
  | "hankaku_alpha"
  | "zenkaku_digit"
  | "hankaku_digit"
  | "zenkaku_space"
  | "hankaku_space"
  | "symbol"
  | "other";

export interface ClassifiedChar {
  char: string;
  category: CharCategory;
  byteWidth: 1 | 2;
}

function inRange(code: number, start: number, end: number): boolean {
  return code >= start && code <= end;
}

export function classifyChar(char: string): ClassifiedChar {
  const code = char.codePointAt(0) ?? 0;

  if (inRange(code, 0x3041, 0x3096) || code === 0x309d || code === 0x309e) {
    return { char, category: "zenkaku_hiragana", byteWidth: 2 };
  }
  if (inRange(code, 0x30a1, 0x30fa) || code === 0x30fc || code === 0x30fd || code === 0x30fe) {
    return { char, category: "zenkaku_katakana", byteWidth: 2 };
  }
  if (inRange(code, 0xff61, 0xff9f)) {
    return { char, category: "hankaku_katakana", byteWidth: 1 };
  }
  if (inRange(code, 0xff21, 0xff3a) || inRange(code, 0xff41, 0xff5a)) {
    return { char, category: "zenkaku_alpha", byteWidth: 2 };
  }
  if (inRange(code, 0x0041, 0x005a) || inRange(code, 0x0061, 0x007a)) {
    return { char, category: "hankaku_alpha", byteWidth: 1 };
  }
  if (inRange(code, 0xff10, 0xff19)) {
    return { char, category: "zenkaku_digit", byteWidth: 2 };
  }
  if (inRange(code, 0x0030, 0x0039)) {
    return { char, category: "hankaku_digit", byteWidth: 1 };
  }
  if (code === 0x3000) {
    return { char, category: "zenkaku_space", byteWidth: 2 };
  }
  if (code === 0x0020) {
    return { char, category: "hankaku_space", byteWidth: 1 };
  }
  if (code <= 0x7f) {
    return { char, category: "symbol", byteWidth: 1 };
  }
  if (
    inRange(code, 0x3001, 0x303f) ||
    inRange(code, 0xff00, 0xff0f) ||
    inRange(code, 0xff1a, 0xff20) ||
    inRange(code, 0xff3b, 0xff40) ||
    inRange(code, 0xff5b, 0xff65) ||
    inRange(code, 0x2000, 0x206f)
  ) {
    return { char, category: "symbol", byteWidth: 2 };
  }
  return { char, category: "other", byteWidth: code <= 0xff ? 1 : 2 };
}

export function classifyText(text: string): ClassifiedChar[] {
  return Array.from(text).map(classifyChar);
}

export const CATEGORY_LABELS: Record<CharCategory, string> = {
  zenkaku_hiragana: "全角ひらがな",
  zenkaku_katakana: "全角カタカナ",
  hankaku_katakana: "半角カタカナ",
  zenkaku_alpha: "全角英字",
  hankaku_alpha: "半角英字",
  zenkaku_digit: "全角数字",
  hankaku_digit: "半角数字",
  zenkaku_space: "全角スペース",
  hankaku_space: "半角スペース",
  symbol: "記号",
  other: "その他",
};

export const CATEGORY_ORDER: CharCategory[] = [
  "zenkaku_hiragana",
  "zenkaku_katakana",
  "hankaku_katakana",
  "zenkaku_alpha",
  "hankaku_alpha",
  "zenkaku_digit",
  "hankaku_digit",
  "zenkaku_space",
  "hankaku_space",
  "symbol",
  "other",
];

export function countByteLength(text: string): number {
  return classifyText(text).reduce((sum, c) => sum + c.byteWidth, 0);
}

// 半角/全角変換は encoding-japanese の実装（JIS X 0201 対応表ベース）に委譲する。
export function alnumToHalfWidth(text: string): string {
  return Encoding.toHankakuCase(text);
}

export function alnumToFullWidth(text: string): string {
  return Encoding.toZenkakuCase(text);
}

export function katakanaToFullWidth(text: string): string {
  return Encoding.toZenkanaCase(text);
}

export function katakanaToHalfWidth(text: string): string {
  return Encoding.toHankanaCase(text);
}

export function spaceToHalfWidth(text: string): string {
  return Encoding.toHankakuSpace(text);
}
