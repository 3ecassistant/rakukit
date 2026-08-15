export type RuleLevel = "warning" | "error";

export interface CharRuleMatch {
  ruleId: string;
  level: RuleLevel;
  reason: string;
  suggestion?: string;
}

interface CharRule {
  id: string;
  test: (codePoint: number) => boolean;
  level: RuleLevel;
  reason: string;
  suggest?: (char: string, codePoint: number) => string | undefined;
}

const CIRCLED_NUMBER_START = 0x2460; // ①
const CIRCLED_NUMBER_END = 0x2473; // ⑳

const ROMAN_NUMERAL_SUGGESTIONS: Record<number, string> = {
  0x2160: "I", 0x2161: "II", 0x2162: "III", 0x2163: "IV", 0x2164: "V",
  0x2165: "VI", 0x2166: "VII", 0x2167: "VIII", 0x2168: "IX", 0x2169: "X",
  0x216a: "XI", 0x216b: "XII",
  0x2170: "i", 0x2171: "ii", 0x2172: "iii", 0x2173: "iv", 0x2174: "v",
  0x2175: "vi", 0x2176: "vii", 0x2177: "viii", 0x2178: "ix", 0x2179: "x",
  0x217a: "xi", 0x217b: "xii",
};

const KISYUIZON_SUGGESTIONS: Record<number, string> = {
  0x3231: "(株)", // ㈱
  0x3232: "(有)", // ㈲
  0x3239: "(代)", // ㈹
  0x3233: "(社)", // ㈳
  0x3236: "(財)", // ㈶
  0x323a: "(問)", // ㈺
  0x3298: "(有)",
  0x2116: "No.", // №
  0x2121: "TEL", // ℡
  0x2103: "°C", // ℃
  0x2109: "°F", // ℉
  0x339c: "mm", // ㎜
  0x339d: "cm", // ㎝
  0x339e: "km", // ㎞
  0x33a1: "m2", // ㎡
  0x33a5: "m3", // ㎥
  0x338f: "kg", // ㎏
  0x338e: "mg", // ㎎
  0x3396: "mL", // ㎖
  0x3397: "dL", // ㎗
  0x3398: "kL", // ㎘
  0x3388: "cc", // ㏄
  0x334d: "ha", // ㏍→ha 近似
  0x337b: "平成",
  0x337c: "昭和",
  0x337d: "大正",
  0x337e: "明治",
};

const RULES: CharRule[] = [
  {
    id: "control-char",
    test: (cp) => cp < 0x20 && cp !== 0x09 && cp !== 0x0a && cp !== 0x0d,
    level: "error",
    reason: "制御文字です（表示・登録エラーの原因になります）",
  },
  {
    id: "invisible",
    test: (cp) => [0x200b, 0x200c, 0x200d, 0xfeff, 0x00a0, 0x2060].includes(cp),
    level: "error",
    reason: "不可視文字です（意図しない空白として残る可能性があります）",
  },
  {
    id: "special-space",
    test: (cp) => (cp >= 0x2000 && cp <= 0x200a) || cp === 0x202f || cp === 0x205f,
    level: "warning",
    reason: "特殊なスペース文字です（環境によって表示が崩れる可能性があります）",
    suggest: () => " ",
  },
  {
    id: "surrogate-pair",
    test: (cp) => cp > 0xffff,
    level: "warning",
    reason: "サロゲートペア文字です（一部の環境で正しく表示されない可能性があります）",
  },
  {
    id: "emoji",
    test: (cp) => (cp >= 0x2600 && cp <= 0x27bf) || (cp >= 0x2b00 && cp <= 0x2bff),
    level: "warning",
    reason: "絵文字・記号です（楽天システムで文字化けする可能性があります）",
  },
  {
    id: "circled-number",
    test: (cp) => cp >= CIRCLED_NUMBER_START && cp <= CIRCLED_NUMBER_END,
    level: "error",
    reason: "丸囲み数字は機種依存文字です",
    suggest: (_char, cp) => String(cp - CIRCLED_NUMBER_START + 1),
  },
  {
    id: "roman-numeral",
    test: (cp) => cp >= 0x2160 && cp <= 0x217b,
    level: "error",
    reason: "ローマ数字は機種依存文字です",
    suggest: (_char, cp) => ROMAN_NUMERAL_SUGGESTIONS[cp],
  },
  {
    id: "kisyuizon-symbol",
    test: (cp) => cp >= 0x3200 && cp <= 0x33ff,
    level: "error",
    reason: "単位記号・丸括弧付き文字などの機種依存文字です",
    suggest: (_char, cp) => KISYUIZON_SUGGESTIONS[cp],
  },
  {
    id: "wave-dash",
    test: (cp) => cp === 0x301c,
    level: "warning",
    reason: "環境によって「～」の表示が異なる場合があります",
    suggest: () => "～",
  },
  {
    id: "dash-variant",
    test: (cp) => [0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212].includes(cp),
    level: "warning",
    reason: "環境によって表示が異なるダッシュ記号です",
    suggest: () => "-",
  },
];

export function checkChar(char: string): CharRuleMatch | null {
  const codePoint = char.codePointAt(0) ?? 0;
  for (const rule of RULES) {
    if (rule.test(codePoint)) {
      return {
        ruleId: rule.id,
        level: rule.level,
        reason: rule.reason,
        suggestion: rule.suggest?.(char, codePoint),
      };
    }
  }
  return null;
}

export interface TextCharIssue extends CharRuleMatch {
  char: string;
  index: number;
}

export function checkText(text: string): TextCharIssue[] {
  const issues: TextCharIssue[] = [];
  let index = 0;
  for (const char of Array.from(text)) {
    const match = checkChar(char);
    if (match) {
      issues.push({ ...match, char, index });
    }
    index += char.length;
  }
  return issues;
}
