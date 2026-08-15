export interface AdditionalCheckResult {
  id: string;
  label: string;
  detected: boolean;
}

const INVISIBLE_CODE_POINTS = [0x200b, 0x200c, 0x200d, 0xfeff, 0x00a0, 0x2060];
const INVISIBLE_CHAR_PATTERN = new RegExp(
  `[${INVISIBLE_CODE_POINTS.map((code) => String.fromCharCode(code)).join("")}]`
);

export function runAdditionalChecks(text: string): AdditionalCheckResult[] {
  return [
    { id: "leading-space", label: "先頭スペース", detected: /^[ 　]/.test(text) },
    { id: "trailing-space", label: "末尾スペース", detected: /[ 　]$/.test(text) },
    { id: "consecutive-space", label: "連続スペース", detected: /[ 　]{2,}/.test(text) },
    {
      id: "consecutive-symbol",
      label: "連続記号（3回以上）",
      detected: /([!-/:-@[-`{-~！-／：-＠［-｀｛-～])\1{2,}/.test(text),
    },
    { id: "line-break", label: "改行", detected: /[\r\n]/.test(text) },
    { id: "tab", label: "タブ", detected: /\t/.test(text) },
    { id: "invisible", label: "不可視文字", detected: INVISIBLE_CHAR_PATTERN.test(text) },
  ];
}

export function countGraphemes(text: string): number {
  return Array.from(text).length;
}

export function countExcludingWhitespace(text: string): number {
  return Array.from(text).filter((ch) => !/\s/.test(ch)).length;
}

export function countLineBreaks(text: string): number {
  const matches = text.match(/\r\n|\r|\n/g);
  return matches ? matches.length : 0;
}
