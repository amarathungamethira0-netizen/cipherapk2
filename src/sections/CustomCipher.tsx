import { useMemo, useState } from "react";
import {
  Btn,
  Card,
  CardTitle,
  CopyBtn,
  IOBox,
  Labeled,
  Note,
  Toggle,
  cn,
  inputCls,
} from "../components/ui";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  MAX_SLOTS,
  decodeText,
  emptyRule,
  encodeText,
  fitSlots,
  newProfile,
  normalizeProfile,
  presetBlank,
  presetMultiDigit,
  presetRandomSymbols,
  presetShiftedAlphabet,
  uid,
  validateProfile,
  type Profile,
  type Rule,
  type UnknownMode,
} from "../lib/customCipher";

const SEPARATORS = [
  { value: " ", label: "Space" },
  { value: "-", label: "Dash -" },
  { value: ".", label: "Dot ." },
  { value: "|", label: "Pipe |" },
  { value: "", label: "None" },
];

function defaultProfiles(): Profile[] {
  const p1 = newProfile("My First List", presetMultiDigit(2), 2);
  p1.separator = " ";
  const p2 = newProfile("Shift +3 (Caesar)", presetShiftedAlphabet(), 2);
  p2.separator = "";
  return [p1, p2];
}

export default function CustomCipher() {
  const [rawProfiles, setRawProfiles] = useLocalStorage<Profile[]>("mapping_lists", defaultProfiles);
  const [activeId, setActiveId] = useLocalStorage<string>("cc.active.v1", "");
  const [plain, setPlain] = useState("attack at dawn");
  const [cipherIn, setCipherIn] = useState("");
  const [nonce, setNonce] = useState(0);
  const [showIO, setShowIO] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  // migrate legacy {a,b} rules on the fly
  const profiles = useMemo(() => (rawProfiles.length ? rawProfiles : defaultProfiles()).map(normalizeProfile), [rawProfiles]);
  const setProfiles = setRawProfiles;

  const active: Profile = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? profiles[0],
    [profiles, activeId],
  );

  const update = (patch: Partial<Profile>) =>
    setProfiles(profiles.map((p) => (p.id === active.id ? { ...p, ...patch, updatedAt: Date.now() } : p)));

  const setRules = (fn: (rules: Rule[]) => Rule[]) => update({ rules: fn(active.rules) });

  const setCode = (ruleId: string, index: number, value: string) =>
    setRules((rules) =>
      rules.map((r) => {
        if (r.id !== ruleId) return r;
        const codes = [...r.codes];
        while (codes.length <= index) codes.push("");
        codes[index] = value;
        return { ...r, codes };
      }),
    );

  /** change how many code columns every row has */
  const setSlots = (n: number) => {
    const slots = Math.min(MAX_SLOTS, Math.max(1, n));
    update({ slots, rules: fitSlots(active.rules, slots) });
  };

  const addProfile = (rules: Rule[], name: string, slots = 2) => {
    const p = newProfile(name, rules, slots);
    setProfiles([...profiles, p]);
    setActiveId(p.id);
  };

  const encoded = useMemo(() => encodeText(plain, active), [plain, active, nonce]);
  const decoded = useMemo(() => decodeText(cipherIn, active), [cipherIn, active]);
  const issues = useMemo(() => validateProfile(active), [active]);

  const slots = Math.max(1, active.slots);
  const rows = useMemo(() => fitSlots(active.rules, slots), [active.rules, slots]);
  const visibleRows = rows.filter(
    (r) =>
      !filter ||
      r.source.toLowerCase().includes(filter.toLowerCase()) ||
      r.codes.some((c) => c.toLowerCase().includes(filter.toLowerCase())),
  );

  const totalCodes = active.rules.reduce((s, r) => s + r.codes.filter((c) => c).length, 0);

  const doImport = () => {
    try {
      const data = JSON.parse(importText);
      const list = Array.isArray(data) ? data : [data];
      const clean = list
        .filter((p) => p && Array.isArray(p.rules))
        .map((p) => ({ ...normalizeProfile(p), id: uid() }));
      if (!clean.length) throw new Error("no lists");
      setProfiles([...profiles, ...clean]);
      setActiveId(clean[0].id);
      setImportMsg(`Imported ${clean.length} list(s) ✔`);
      setImportText("");
    } catch {
      setImportMsg("Invalid JSON — paste a list exported from this tool.");
    }
  };

  return (
    <div className="space-y-5">
      {/* ---------------- saved lists ---------------- */}
      <Card>
        <CardTitle
          icon="🗂️"
          title="Saved mapping lists"
          sub="සුරැකි ලැයිස්තු — ඕනෑම එකක් තෝරලා encode / decode කරන්න. මේ device එකේ localStorage එකට auto-save වෙනවා."
          right={
            <>
              <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300">
                ✓ Saved on device
              </span>
              <Btn size="sm" variant="ghost" onClick={() => addProfile(presetBlank(), `List ${profiles.length + 1}`)}>
                ＋ New empty
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => addProfile(presetMultiDigit(3), `3-code list ${profiles.length + 1}`, 3)}>
                ⚄ A–Z × 3 codes
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => addProfile(presetRandomSymbols(2), `Symbol list ${profiles.length + 1}`, 2)}>
                ✦ Random symbols
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setShowIO((v) => !v)}>
                {showIO ? "Hide" : "Import / Export"}
              </Btn>
            </>
          }
        />
        <div className="flex flex-wrap gap-2">
          {profiles.map((p) => {
            const isActive = p.id === active.id;
            const codeCount = p.rules.reduce((s, r) => s + r.codes.filter((c) => c).length, 0);
            return (
              <div
                key={p.id}
                className={cn(
                  "group flex items-center gap-2 rounded-xl border px-3 py-2 transition-all",
                  isActive
                    ? "border-cyan-400/50 bg-gradient-to-r from-cyan-500/15 to-violet-500/15 shadow-lg shadow-cyan-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25",
                )}
              >
                <button onClick={() => setActiveId(p.id)} className="text-left">
                  <span className={cn("block text-sm font-medium", isActive ? "text-white" : "text-slate-300")}>{p.name}</span>
                  <span className="block text-[11px] text-slate-500">
                    {p.rules.filter((r) => r.source && r.codes.some((c) => c)).length} chars · {codeCount} codes
                    {p.separator === "" ? " · no sep" : ` · "${p.separator}"`}
                  </span>
                </button>
                {isActive && (
                  <div className="flex items-center gap-1 pl-1">
                    <button
                      title="Rename"
                      className="rounded p-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
                      onClick={() => {
                        const n = window.prompt("List name", p.name);
                        if (n) update({ name: n });
                      }}
                    >
                      ✎
                    </button>
                    <button
                      title="Duplicate"
                      className="rounded p-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
                      onClick={() => addProfile(p.rules.map((r) => ({ ...r, id: uid(), codes: [...r.codes] })), `${p.name} copy`, p.slots)}
                    >
                      ⧉
                    </button>
                    <button
                      title="Delete"
                      className="rounded p-1 text-xs text-rose-400 hover:bg-rose-500/20"
                      onClick={() => {
                        if (profiles.length === 1) return;
                        const rest = profiles.filter((x) => x.id !== p.id);
                        setProfiles(rest);
                        setActiveId(rest[0].id);
                      }}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showIO && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <IOBox
              label="Export current list (JSON)"
              hint="copy & keep it safe"
              value={JSON.stringify(active, null, 2)}
              rows={6}
              mono
              accent="violet"
            />
            <div className="space-y-2">
              <IOBox
                label="Import list (paste JSON)"
                value={importText}
                onChange={(v) => {
                  setImportText(v);
                  setImportMsg(null);
                }}
                rows={6}
                mono
                accent="emerald"
                placeholder='{"name":"My list","rules":[{"source":"a","codes":["12","77"]}]}'
              />
              <div className="flex items-center gap-2">
                <Btn variant="primary" size="sm" onClick={doImport} disabled={!importText.trim()}>
                  Import list
                </Btn>
                <CopyBtn value={JSON.stringify(profiles, null, 2)} label="Copy ALL lists" size="sm" />
                {importMsg && <span className="text-xs text-slate-400">{importMsg}</span>}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ---------------- mapping editor ---------------- */}
        <Card>
          <CardTitle
            icon="🔤"
            title={`Mapping · ${active.name}`}
            sub="Character එකකට codes කීයක් හරි assign කරන්න පුළුවන් — encode වෙද්දී ඒවායින් එකක් random විදිහට තෝරාගනී."
            right={
              <>
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="filter…"
                  className="w-24 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-400/50"
                />
                <Btn size="sm" variant="ghost" onClick={() => setRules((r) => [...r, emptyRule()])}>
                  ＋ Row
                </Btn>
                <Btn size="sm" variant="ghost" title="Load A–Z rows" onClick={() => update({ rules: fitSlots(presetMultiDigit(slots), slots) })}>
                  A–Z
                </Btn>
                <Btn size="sm" variant="danger" onClick={() => update({ rules: presetBlank() })}>
                  Clear
                </Btn>
              </>
            }
          />

          {/* ---- codes-per-character control ---- */}
          <div className="mb-3 rounded-xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 to-violet-500/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-white">Codes per character</div>
                <div className="text-[11px] text-slate-400">
                  එක් අකුරකට symbols කීයක් assign කරන්නද? (1 – {MAX_SLOTS}) · දැන් <span className="text-cyan-300">{slots}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Btn size="sm" variant="ghost" onClick={() => setSlots(slots - 1)} disabled={slots <= 1} title="Remove one code column">
                  −
                </Btn>
                <div className="w-12 rounded-lg border border-white/15 bg-black/50 py-1.5 text-center font-mono text-lg text-cyan-200">
                  {slots}
                </div>
                <Btn size="sm" variant="ghost" onClick={() => setSlots(slots + 1)} disabled={slots >= MAX_SLOTS} title="Add one more code column">
                  ＋
                </Btn>
                <div className="ml-1 flex gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSlots(n)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                        slots === n ? "bg-cyan-400/25 text-cyan-200" : "bg-white/5 text-slate-400 hover:bg-white/10",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <Labeled label="Separator between codes">
              <select value={active.separator} onChange={(e) => update({ separator: e.target.value })} className={inputCls}>
                {SEPARATORS.map((s) => (
                  <option key={s.label} value={s.value} className="bg-slate-900">
                    {s.label}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Unknown characters">
              <select
                value={active.unknownMode}
                onChange={(e) => update({ unknownMode: e.target.value as UnknownMode })}
                className={inputCls}
              >
                <option value="keep" className="bg-slate-900">Keep as-is</option>
                <option value="skip" className="bg-slate-900">Remove</option>
                <option value="mark" className="bg-slate-900">Replace with ?</option>
              </select>
            </Labeled>
            <div className="flex items-end">
              <Toggle
                checked={active.caseSensitive}
                onChange={(v) => update({ caseSensitive: v })}
                label="Case sensitive"
                hint="A and a treated separately"
              />
            </div>
          </div>

          <div className="max-h-[420px] overflow-auto rounded-xl border border-white/10">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
                <tr className="text-[11px] tracking-widest text-slate-400 uppercase">
                  <th className="w-24 px-3 py-2 text-left font-semibold">Char(s)</th>
                  {Array.from({ length: slots }).map((_, i) => (
                    <th key={i} className="px-1.5 py-2 text-left font-semibold">
                      Code {i + 1}
                      {i > 0 && <span className="ml-1 text-[9px] text-slate-600">alt</span>}
                    </th>
                  ))}
                  <th className="w-8 px-1 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="px-3 py-1.5">
                      <input
                        value={r.source}
                        maxLength={2}
                        onChange={(e) => setRules((rules) => rules.map((x) => (x.id === r.id ? { ...x, source: e.target.value } : x)))}
                        placeholder="a / th"
                        className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-center font-mono text-sm text-cyan-300 outline-none focus:border-cyan-400/60"
                      />
                    </td>
                    {Array.from({ length: slots }).map((_, i) => (
                      <td key={i} className="px-1.5 py-1.5">
                        <input
                          value={r.codes[i] ?? ""}
                          onChange={(e) => setCode(r.id, i, e.target.value)}
                          placeholder={i === 0 ? "code" : "optional"}
                          className={cn(
                            "w-full min-w-[64px] rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-center font-mono text-sm outline-none focus:border-violet-400/60",
                            i === 0 ? "text-violet-200" : "text-violet-300/70",
                          )}
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1.5 text-center">
                      <button
                        onClick={() => setRules((rules) => rules.filter((x) => x.id !== r.id))}
                        className="rounded p-1 text-xs text-slate-500 hover:bg-rose-500/20 hover:text-rose-300"
                        title="Delete row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {!visibleRows.length && (
                  <tr>
                    <td colSpan={slots + 2} className="px-3 py-6 text-center text-xs text-slate-500">
                      No rows. Press “＋ Row” to add your first mapping.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            {rows.length} rows · {totalCodes} codes assigned
          </div>

          <div className="mt-3 space-y-1.5">
            {issues.slice(0, 4).map((i, k) => (
              <Note key={k} tone={i.level === "ok" ? "ok" : i.level === "warn" ? "warn" : "error"}>
                {i.text}
              </Note>
            ))}
          </div>
        </Card>

        {/* ---------------- encode / decode ---------------- */}
        <div className="space-y-5">
          <Card>
            <CardTitle
              icon="🔒"
              title="Encode"
              sub="Plain text → secret code"
              right={
                <Btn size="sm" variant="primary" onClick={() => setNonce((n) => n + 1)} title="Pick new random alternatives">
                  🎲 Re-roll random
                </Btn>
              }
            />
            <div className="space-y-3">
              <IOBox label="Plain text" value={plain} onChange={setPlain} rows={3} placeholder="Type the message…" accent="cyan" />
              <div className="flex justify-center text-slate-600">▼</div>
              <IOBox
                label="Secret code"
                hint={`${encoded.mappedCount} mapped`}
                value={encoded.output}
                rows={3}
                mono
                accent="violet"
                footer={
                  encoded.unknown.length ? (
                    <span className="text-amber-300">
                      Not in list: {encoded.unknown.slice(0, 12).map((c) => `"${c}"`).join(", ")}
                      {encoded.unknown.length > 12 ? " …" : ""}
                    </span>
                  ) : (
                    <span className="text-emerald-300/80">Every character was mapped ✔</span>
                  )
                }
              />
              {encoded.tokens.some((t) => t.mapped) && (
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/5 bg-black/20 p-2">
                  {encoded.tokens.slice(0, 60).map((t, i) => (
                    <span
                      key={i}
                      className={cn(
                        "rounded-md px-1.5 py-0.5 font-mono text-[11px]",
                        t.mapped ? "bg-violet-500/15 text-violet-200" : "bg-white/5 text-slate-500",
                      )}
                      title={`${t.from} → ${t.text}`}
                    >
                      {t.from === " " ? "␣" : t.from}
                      <span className="text-slate-500">→</span>
                      {t.text === " " ? "␣" : t.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle
              icon="🔓"
              title="Decode"
              sub="Secret code → plain text"
              right={
                <Btn size="sm" variant="ghost" onClick={() => setCipherIn(encoded.output)} title="Use the code generated above">
                  ↥ Use encoded output
                </Btn>
              }
            />
            <div className="space-y-3">
              <IOBox label="Secret code" value={cipherIn} onChange={setCipherIn} rows={3} mono placeholder="Paste the code…" accent="amber" />
              <div className="flex justify-center text-slate-600">▼</div>
              <IOBox
                label="Decoded text"
                value={decoded.output}
                rows={3}
                accent="emerald"
                footer={
                  decoded.unresolved.length ? (
                    <span className="text-amber-300">Unknown codes: {decoded.unresolved.slice(0, 10).map((c) => `"${c}"`).join(", ")}</span>
                  ) : (
                    <span className="text-slate-500">Uses the active list · any of the assigned codes decodes back</span>
                  )
                }
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
