/* ------------------------------------------------------------------
   SECTION 03 - Hill cipher (matrix key) with mod 100
   Every character has a 2 digit code (00 - 99) so the whole cipher
   works nicely in modulo 100.
-------------------------------------------------------------------*/

export const MOD = 100;

/** 100 slots -> exactly one 2-digit code per character. */
export const CODE_TABLE: string[] = (() => {
  const t: string[] = [];
  t[0] = " ";
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((c, i) => (t[1 + i] = c));
  "0123456789".split("").forEach((c, i) => (t[27 + i] = c));
  [".", ",", "?", "!", "'", '"', "-", ":", ";", "(", ")", "/", "\n"].forEach((c, i) => (t[37 + i] = c));
  "abcdefghijklmnopqrstuvwxyz".split("").forEach((c, i) => (t[50 + i] = c));
  ["@", "#", "$", "%", "&", "*", "+", "=", "_", "[", "]", "{", "}", "<", ">", "\\", "|", "~", "^", "`", "\t", "€", "£", "¥"].forEach(
    (c, i) => (t[76 + i] = c),
  );
  for (let i = 0; i < 100; i++) if (t[i] === undefined) t[i] = "·";
  return t;
})();

export const CHAR_TO_CODE: Map<string, number> = (() => {
  const m = new Map<string, number>();
  CODE_TABLE.forEach((c, i) => {
    if (!m.has(c)) m.set(c, i);
  });
  return m;
})();

export function codeOf(ch: string, uppercaseOnly: boolean): number | null {
  if (uppercaseOnly) {
    const up = ch.toUpperCase();
    if (CHAR_TO_CODE.has(up)) return CHAR_TO_CODE.get(up)!;
  }
  if (CHAR_TO_CODE.has(ch)) return CHAR_TO_CODE.get(ch)!;
  const up = ch.toUpperCase();
  if (CHAR_TO_CODE.has(up)) return CHAR_TO_CODE.get(up)!;
  return null;
}

/* --------------------------- math --------------------------- */

export const mod = (n: number, m: number) => ((n % m) + m) % m;

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function modInverse(a: number, m: number): number | null {
  a = mod(a, m);
  for (let x = 1; x < m; x++) if (mod(a * x, m) === 1) return x;
  return null;
}

export function determinant(mx: number[][]): number {
  const n = mx.length;
  if (n === 1) return mx[0][0];
  if (n === 2) return mx[0][0] * mx[1][1] - mx[0][1] * mx[1][0];
  let d = 0;
  for (let c = 0; c < n; c++) {
    const minor = mx.slice(1).map((row) => row.filter((_, j) => j !== c));
    d += (c % 2 === 0 ? 1 : -1) * mx[0][c] * determinant(minor);
  }
  return d;
}

export function inverseMod(mx: number[][], m: number): number[][] | null {
  const n = mx.length;
  const det = mod(determinant(mx), m);
  const dInv = modInverse(det, m);
  if (dInv === null) return null;

  if (n === 1) return [[dInv]];

  const cof: number[][] = [];
  for (let i = 0; i < n; i++) {
    cof[i] = [];
    for (let j = 0; j < n; j++) {
      const minor = mx.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
      cof[i][j] = ((i + j) % 2 === 0 ? 1 : -1) * determinant(minor);
    }
  }
  const adj: number[][] = [];
  for (let i = 0; i < n; i++) {
    adj[i] = [];
    for (let j = 0; j < n; j++) adj[i][j] = mod(dInv * cof[j][i], m);
  }
  return adj;
}

export function multiplyVector(mx: number[][], vec: number[], m: number): number[] {
  return mx.map((row) => mod(row.reduce((s, v, i) => s + v * vec[i], 0), m));
}

export type KeyCheck = {
  size: number;
  det: number;
  detMod: number;
  g: number;
  invertible: boolean;
  inverse: number[][] | null;
  canEncode: boolean;
  messages: string[];
};

export function checkKey(mx: number[][], m: number = MOD): KeyCheck {
  const size = mx.length;
  const flat = mx.flat();
  const messages: string[] = [];
  const numeric = flat.every((v) => Number.isFinite(v));
  if (!numeric) {
    return { size, det: 0, detMod: 0, g: 0, invertible: false, inverse: null, canEncode: false, messages: ["Fill every cell with a number."] };
  }
  const det = determinant(mx);
  const detMod = mod(det, m);
  const g = gcd(detMod, m);
  const inverse = inverseMod(mx, m);
  const invertible = inverse !== null;

  messages.push(`det(K) = ${det}  →  det mod ${m} = ${detMod}`);
  messages.push(`gcd(${detMod}, ${m}) = ${g}`);
  if (detMod === 0) messages.push("Determinant is 0 (mod " + m + ") — this key can never be reversed.");
  else if (!invertible)
    messages.push(`Determinant must be coprime with ${m} (not divisible by 2 or 5). ENCODE works, DECODE is impossible.`);
  else messages.push("Key is valid for ENCODE ✔ and DECODE ✔");

  return { size, det, detMod, g, invertible, inverse, canEncode: true, messages };
}

/* ------------------------- encode / decode ------------------------- */

export type MatrixEncodeResult = {
  numbers: number[];
  codes: number[];
  blocks: { inVec: number[]; outVec: number[] }[];
  skipped: string[];
  padded: number;
};

export function textToCodes(text: string, uppercaseOnly: boolean): { codes: number[]; skipped: string[] } {
  const codes: number[] = [];
  const skipped: string[] = [];
  for (const ch of Array.from(text)) {
    const c = codeOf(ch, uppercaseOnly);
    if (c === null) skipped.push(ch);
    else codes.push(c);
  }
  return { codes, skipped };
}

export function matrixEncode(text: string, key: number[][], uppercaseOnly: boolean, m: number = MOD): MatrixEncodeResult {
  const n = key.length;
  const { codes, skipped } = textToCodes(text, uppercaseOnly);
  const work = [...codes];
  let padded = 0;
  while (work.length % n !== 0) {
    work.push(0); // pad with space
    padded++;
  }
  const numbers: number[] = [];
  const blocks: { inVec: number[]; outVec: number[] }[] = [];
  for (let i = 0; i < work.length; i += n) {
    const inVec = work.slice(i, i + n);
    const outVec = multiplyVector(key, inVec, m);
    blocks.push({ inVec, outVec });
    numbers.push(...outVec);
  }
  return { numbers, codes, blocks, skipped, padded };
}

export function parseNumbers(input: string, m: number = MOD): { numbers: number[]; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { numbers: [], error: null };
  const hasSeparators = /[\s,;|\-]/.test(trimmed);
  let tokens: string[];
  if (hasSeparators) {
    tokens = trimmed.split(/[^0-9]+/).filter(Boolean);
  } else {
    const digits = trimmed.replace(/[^0-9]/g, "");
    if (digits.length % 2 !== 0)
      return { numbers: [], error: "Odd number of digits — every character code must be 2 digits (e.g. 07 42 91)." };
    tokens = digits.match(/.{2}/g) ?? [];
  }
  const numbers: number[] = [];
  for (const t of tokens) {
    const v = parseInt(t, 10);
    if (Number.isNaN(v)) return { numbers: [], error: `Cannot read "${t}".` };
    if (v >= m) return { numbers: [], error: `Value ${v} is out of range (0 – ${m - 1}).` };
    numbers.push(v);
  }
  return { numbers, error: null };
}

export type MatrixDecodeResult = {
  text: string;
  codes: number[];
  blocks: { inVec: number[]; outVec: number[] }[];
  error: string | null;
};

export function matrixDecode(input: string, key: number[][], m: number = MOD): MatrixDecodeResult {
  const n = key.length;
  const inv = inverseMod(key, m);
  if (!inv)
    return { text: "", codes: [], blocks: [], error: `This key matrix has no inverse mod ${m} — decoding is not possible. Run "Check Matrix".` };

  const { numbers, error } = parseNumbers(input, m);
  if (error) return { text: "", codes: [], blocks: [], error };
  if (!numbers.length) return { text: "", codes: [], blocks: [], error: null };
  if (numbers.length % n !== 0)
    return { text: "", codes: [], blocks: [], error: `Number count (${numbers.length}) must be a multiple of ${n}.` };

  const codes: number[] = [];
  const blocks: { inVec: number[]; outVec: number[] }[] = [];
  for (let i = 0; i < numbers.length; i += n) {
    const inVec = numbers.slice(i, i + n);
    const outVec = multiplyVector(inv, inVec, m);
    blocks.push({ inVec, outVec });
    codes.push(...outVec);
  }
  return { text: codes.map((c) => CODE_TABLE[c] ?? "·").join(""), codes, blocks, error: null };
}

export const format2 = (n: number) => n.toString().padStart(2, "0");

export function formatNumbers(nums: number[], removeSpaces: boolean, groupSize = 0): string {
  const parts = nums.map(format2);
  if (removeSpaces) {
    if (groupSize > 0) {
      const joined = parts.join("");
      return (joined.match(new RegExp(`.{1,${groupSize}}`, "g")) ?? []).join(" ");
    }
    return parts.join("");
  }
  return parts.join(" ");
}

export function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

/** A few keys that are guaranteed invertible mod 100. */
export const SAMPLE_KEYS: Record<number, number[][][]> = {
  2: [
    [
      [3, 5],
      [1, 2],
    ],
    [
      [7, 8],
      [11, 13],
    ],
    [
      [9, 4],
      [5, 9],
    ],
  ],
  3: [
    [
      [2, 3, 1],
      [1, 1, 1],
      [3, 1, 2],
    ],
    [
      [6, 24, 1],
      [13, 16, 10],
      [20, 17, 15],
    ],
  ],
};
