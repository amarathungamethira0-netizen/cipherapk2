/* ------------------------------------------------------------------
   SECTION 02 - Text <-> Binary / Decimal / Octal / Hexadecimal
-------------------------------------------------------------------*/

export type BaseKey = "bin" | "dec" | "oct" | "hex";
export type UnitMode = "utf8" | "codepoint";

export const BASES: { key: BaseKey; radix: number; label: string; short: string; pad: number }[] = [
  { key: "bin", radix: 2, label: "Binary", short: "BIN", pad: 8 },
  { key: "dec", radix: 10, label: "Decimal", short: "DEC", pad: 3 },
  { key: "oct", radix: 8, label: "Octal", short: "OCT", pad: 3 },
  { key: "hex", radix: 16, label: "Hexadecimal", short: "HEX", pad: 2 },
];

export function textToUnits(text: string, mode: UnitMode): number[] {
  if (mode === "utf8") return Array.from(new TextEncoder().encode(text));
  return Array.from(text).map((c) => c.codePointAt(0) ?? 0);
}

export function unitsToText(units: number[], mode: UnitMode): string {
  if (mode === "utf8") {
    const bytes = Uint8Array.from(units.map((n) => n & 0xff));
    return new TextDecoder().decode(bytes);
  }
  return units.map((n) => String.fromCodePoint(n)).join("");
}

export function padWidth(base: BaseKey, mode: UnitMode, units: number[]): number {
  const def = BASES.find((b) => b.key === base)!;
  if (mode === "utf8") return def.pad;
  const max = units.length ? Math.max(...units) : 0;
  const natural = max.toString(def.radix).length;
  return Math.max(def.pad, natural);
}

export type EncodeOpts = {
  mode: UnitMode;
  pad: boolean;
  separator: string;
  uppercase: boolean;
  prefix: boolean;
};

export function encodeToBase(text: string, base: BaseKey, opts: EncodeOpts): string {
  if (!text) return "";
  const def = BASES.find((b) => b.key === base)!;
  const units = textToUnits(text, opts.mode);
  const w = padWidth(base, opts.mode, units);
  const pre = opts.prefix ? { bin: "0b", oct: "0o", hex: "0x", dec: "" }[base] : "";
  return units
    .map((n) => {
      let s = n.toString(def.radix);
      if (opts.pad) s = s.padStart(w, "0");
      if (opts.uppercase) s = s.toUpperCase();
      return pre + s;
    })
    .join(opts.separator);
}

const VALID: Record<BaseKey, RegExp> = {
  bin: /^[01]+$/,
  dec: /^[0-9]+$/,
  oct: /^[0-7]+$/,
  hex: /^[0-9a-fA-F]+$/,
};

export function decodeFromBase(
  input: string,
  base: BaseKey,
  mode: UnitMode,
): { text: string; error: string | null; count: number } {
  const def = BASES.find((b) => b.key === base)!;
  const cleaned = input
    .replace(/0[bxo]/gi, " ")
    .replace(/[,;|]/g, " ")
    .trim();
  if (!cleaned) return { text: "", error: null, count: 0 };

  let tokens = cleaned.split(/\s+/).filter(Boolean);

  // No separators given -> chop the long string into fixed-width chunks
  if (tokens.length === 1 && tokens[0].length > def.pad) {
    const t = tokens[0];
    if (t.length % def.pad === 0) {
      tokens = t.match(new RegExp(`.{${def.pad}}`, "g")) ?? [t];
    }
  }

  const units: number[] = [];
  for (const t of tokens) {
    if (!VALID[base].test(t)) return { text: "", error: `"${t}" is not a valid ${def.label.toLowerCase()} value.`, count: 0 };
    const n = parseInt(t, def.radix);
    if (Number.isNaN(n)) return { text: "", error: `Cannot parse "${t}".`, count: 0 };
    units.push(n);
  }
  try {
    return { text: unitsToText(units, mode), error: null, count: units.length };
  } catch {
    return { text: "", error: "Values are out of range for the selected unit mode.", count: 0 };
  }
}

/* ------------- plain number base converter (BigInt safe) ------------- */

export function convertNumber(value: string, from: BaseKey): { out: Record<BaseKey, string>; error: string | null } {
  const empty: Record<BaseKey, string> = { bin: "", dec: "", oct: "", hex: "" };
  const clean = value.trim().replace(/^0[bxo]/i, "").replace(/[\s_,]/g, "");
  if (!clean) return { out: empty, error: null };
  if (!VALID[from].test(clean)) return { out: empty, error: `Not a valid ${from.toUpperCase()} number.` };

  const radix = BASES.find((b) => b.key === from)!.radix;
  let n = 0n;
  const digits = "0123456789abcdef";
  for (const ch of clean.toLowerCase()) {
    n = n * BigInt(radix) + BigInt(digits.indexOf(ch));
  }
  return {
    out: {
      bin: n.toString(2),
      dec: n.toString(10),
      oct: n.toString(8),
      hex: n.toString(16).toUpperCase(),
    },
    error: null,
  };
}
