/* ------------------------------------------------------------------
   SECTION 01 - Custom substitution cipher engine
   Any character (or 2-character group) -> ANY number of replacement
   codes. When more than one code is assigned, encoding randomly
   picks one of them.
-------------------------------------------------------------------*/

export type Rule = {
  id: string;
  source: string; // 1 or 2 characters (the plain text piece)
  codes: string[]; // 1..N replacement codes -> random pick on encode
};

export type UnknownMode = "keep" | "skip" | "mark";

export type Profile = {
  id: string;
  name: string;
  rules: Rule[];
  separator: string; // inserted between output tokens ("" = none)
  caseSensitive: boolean;
  unknownMode: UnknownMode;
  slots: number; // how many code columns the editor shows
  updatedAt: number;
};

export const MAX_SLOTS = 8;

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const emptyRule = (source = "", ...codes: string[]): Rule => ({
  id: uid(),
  source,
  codes: codes.length ? codes : [""],
});

/** Accepts legacy rules that used {a, b} and normalises them. */
export function normalizeRule(r: any): Rule {
  if (!r) return emptyRule();
  if (Array.isArray(r.codes)) return { id: r.id ?? uid(), source: r.source ?? "", codes: r.codes.map(String) };
  const codes = [r.a ?? "", r.b ?? ""].filter((x: string, i: number) => x !== "" || i === 0);
  return { id: r.id ?? uid(), source: r.source ?? "", codes: codes.length ? codes : [""] };
}

export function normalizeProfile(p: any): Profile {
  const rules = Array.isArray(p?.rules) ? p.rules.map(normalizeRule) : [emptyRule()];
  const maxCodes = rules.reduce((m: number, r: Rule) => Math.max(m, r.codes.length), 1);
  return {
    id: p?.id ?? uid(),
    name: p?.name ?? "Untitled list",
    rules,
    separator: typeof p?.separator === "string" ? p.separator : " ",
    caseSensitive: !!p?.caseSensitive,
    unknownMode: (p?.unknownMode as UnknownMode) ?? "keep",
    slots: Math.min(MAX_SLOTS, Math.max(2, p?.slots ?? maxCodes)),
    updatedAt: p?.updatedAt ?? Date.now(),
  };
}

export function newProfile(name: string, rules: Rule[] = [], slots = 2): Profile {
  return {
    id: uid(),
    name,
    rules: rules.length ? rules : [emptyRule(), emptyRule(), emptyRule()],
    separator: " ",
    caseSensitive: false,
    unknownMode: "keep",
    slots: Math.min(MAX_SLOTS, Math.max(2, slots)),
    updatedAt: Date.now(),
  };
}

/** Ensure every rule has exactly `slots` code cells (for the editor grid). */
export function fitSlots(rules: Rule[], slots: number): Rule[] {
  return rules.map((r) => {
    const codes = [...r.codes];
    while (codes.length < slots) codes.push("");
    return { ...r, codes: codes.slice(0, slots) };
  });
}

const norm = (s: string, caseSensitive: boolean) => (caseSensitive ? s : s.toLowerCase());

type ActiveRule = { source: string; chars: string[]; targets: string[] };

function activeRules(p: Profile): ActiveRule[] {
  return p.rules
    .filter((r) => r.source.length > 0 && r.codes.some((c) => c.length > 0))
    .map((r) => ({
      source: r.source,
      chars: Array.from(r.source),
      targets: r.codes.filter((t) => t.length > 0),
    }))
    .sort((x, y) => y.chars.length - x.chars.length);
}

export type EncodeResult = {
  output: string;
  tokens: { text: string; mapped: boolean; from: string }[];
  unknown: string[];
  mappedCount: number;
};

export function encodeText(text: string, p: Profile): EncodeResult {
  const rules = activeRules(p);
  const chars = Array.from(text);
  const tokens: EncodeResult["tokens"] = [];
  const unknown = new Set<string>();
  let mappedCount = 0;

  let i = 0;
  while (i < chars.length) {
    let hit: ActiveRule | null = null;
    for (const r of rules) {
      const slice = chars.slice(i, i + r.chars.length).join("");
      if (slice.length === r.source.length && norm(slice, p.caseSensitive) === norm(r.source, p.caseSensitive)) {
        hit = r;
        break;
      }
    }
    if (hit) {
      const pick = hit.targets[Math.floor(Math.random() * hit.targets.length)];
      tokens.push({ text: pick, mapped: true, from: chars.slice(i, i + hit.chars.length).join("") });
      mappedCount++;
      i += hit.chars.length;
    } else {
      const c = chars[i];
      if (c.trim() !== "") unknown.add(c);
      if (p.unknownMode === "keep") tokens.push({ text: c, mapped: false, from: c });
      else if (p.unknownMode === "mark") tokens.push({ text: "?", mapped: false, from: c });
      i += 1;
    }
  }

  return {
    output: tokens.map((t) => t.text).join(p.separator),
    tokens,
    unknown: [...unknown],
    mappedCount,
  };
}

export type DecodeResult = { output: string; unresolved: string[] };

export function decodeText(text: string, p: Profile): DecodeResult {
  const rules = activeRules(p);
  const pairs: { target: string; source: string }[] = [];
  for (const r of rules) for (const t of r.targets) pairs.push({ target: t, source: r.source });
  pairs.sort((x, y) => Array.from(y.target).length - Array.from(x.target).length);

  const lookup = (tok: string): string | null => {
    const found = pairs.find((pr) => norm(pr.target, p.caseSensitive) === norm(tok, p.caseSensitive));
    return found ? found.source : null;
  };

  const unresolved = new Set<string>();

  if (p.separator.length > 0) {
    const parts = text.split(p.separator);
    let out = "";
    let emptyRun = 0;
    const flushEmpty = () => {
      // two consecutive separators == one literal separator character in the source text
      if (emptyRun > 0) out += p.separator.repeat(Math.floor(emptyRun / 2));
      emptyRun = 0;
    };
    for (const tok of parts) {
      if (tok === "") {
        emptyRun++;
        continue;
      }
      flushEmpty();
      const s = lookup(tok);
      if (s === null) {
        unresolved.add(tok);
        out += tok;
      } else {
        out += s;
      }
    }
    flushEmpty();
    return { output: out, unresolved: [...unresolved] };
  }

  // No separator -> greedy longest match scan
  const chars = Array.from(text);
  let i = 0;
  let out = "";
  while (i < chars.length) {
    let matched = false;
    for (const pr of pairs) {
      const len = Array.from(pr.target).length;
      const slice = chars.slice(i, i + len).join("");
      if (slice.length === pr.target.length && norm(slice, p.caseSensitive) === norm(pr.target, p.caseSensitive)) {
        out += pr.source;
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (chars[i].trim() !== "") unresolved.add(chars[i]);
      out += chars[i];
      i += 1;
    }
  }
  return { output: out, unresolved: [...unresolved] };
}

export type Issue = { level: "error" | "warn" | "ok"; text: string };

export function validateProfile(p: Profile): Issue[] {
  const issues: Issue[] = [];
  const used = p.rules.filter((r) => r.source || r.codes.some((c) => c));

  const srcSeen = new Map<string, number>();
  for (const r of used) {
    const filled = r.codes.filter((c) => c);
    if (!r.source) {
      issues.push({ level: "error", text: "A row has replacements but no source character." });
      continue;
    }
    if (!filled.length) issues.push({ level: "error", text: `"${r.source}" has no replacement assigned.` });
    const key = p.caseSensitive ? r.source : r.source.toLowerCase();
    srcSeen.set(key, (srcSeen.get(key) ?? 0) + 1);
  }
  for (const [k, n] of srcSeen) {
    if (n > 1) issues.push({ level: "error", text: `Source "${k}" is repeated ${n} times — keep it unique.` });
  }

  const tgt = new Map<string, Set<string>>();
  for (const r of used) {
    for (const t of r.codes) {
      if (!t) continue;
      const key = p.caseSensitive ? t : t.toLowerCase();
      if (!tgt.has(key)) tgt.set(key, new Set());
      tgt.get(key)!.add(r.source);
    }
  }
  for (const [t, sources] of tgt) {
    if (sources.size > 1)
      issues.push({
        level: "warn",
        text: `Code "${t}" is shared by ${[...sources].join(", ")} — decoding will be ambiguous.`,
      });
  }

  // duplicate codes inside the same row (harmless but pointless)
  for (const r of used) {
    const filled = r.codes.filter((c) => c).map((c) => (p.caseSensitive ? c : c.toLowerCase()));
    if (new Set(filled).size !== filled.length)
      issues.push({ level: "warn", text: `"${r.source}" has the same code twice — remove the duplicate.` });
  }

  if (!p.separator) {
    const lens = new Set<number>();
    for (const r of used) for (const t of r.codes) if (t) lens.add(Array.from(t).length);
    if (lens.size > 1)
      issues.push({
        level: "warn",
        text: "Codes have different lengths and no separator is used — decode may be inaccurate. Add a separator (e.g. space or -).",
      });
  }

  if (!issues.length && used.length) {
    const total = used.reduce((s, r) => s + r.codes.filter((c) => c).length, 0);
    issues.push({
      level: "ok",
      text: `Mapping list is healthy — ${used.length} characters, ${total} codes ready for encode & decode.`,
    });
  }

  return issues;
}

/* ---------------- presets ---------------- */

const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function presetShiftedAlphabet(): Rule[] {
  return AZ.map((c, i) => emptyRule(c, AZ[(i + 3) % 26]));
}

/** each letter gets `n` numeric codes -> random choice on every encode */
export function presetMultiDigit(n = 2): Rule[] {
  return AZ.map((c, i) => emptyRule(c, ...Array.from({ length: n }, (_, k) => String(i + 11 + k * 30))));
}

export function presetRandomSymbols(codesPer = 2): Rule[] {
  const pool = "!@#$%^&*()[]{}<>+=?/~;:.,|".split("");
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const used = new Set<string>();
  const pick = () => {
    for (let i = 0; i < 500; i++) {
      const t = letters[Math.floor(Math.random() * 26)] + pool[Math.floor(Math.random() * pool.length)];
      if (!used.has(t)) {
        used.add(t);
        return t;
      }
    }
    return String(used.size);
  };
  return AZ.map((c) => emptyRule(c, ...Array.from({ length: codesPer }, pick)));
}

export function presetBlank(): Rule[] {
  return [emptyRule(), emptyRule(), emptyRule()];
}
