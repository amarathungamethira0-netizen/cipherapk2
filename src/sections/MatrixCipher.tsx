import { useMemo, useState } from "react";
import { Btn, Card, CardTitle, CopyBtn, IOBox, Note, PasteBtn, Segmented, Toggle, cn } from "../components/ui";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  CODE_TABLE,
  MOD,
  SAMPLE_KEYS,
  checkKey,
  format2,
  formatNumbers,
  inverseMod,
  matrixDecode,
  matrixEncode,
} from "../lib/matrixCipher";

const flatten = (m: number[][]) => m.flat().map(String);

type SavedKey = { id: string; name: string; size: number; cells: string[]; savedAt: number };

const DEFAULT_MATRIX_KEYS: SavedKey[] = [
  { id: "sample-2x2-1", name: "Sample 2×2 #1", size: 2, cells: flatten(SAMPLE_KEYS[2][0]), savedAt: 0 },
  { id: "sample-2x2-2", name: "Sample 2×2 #2", size: 2, cells: flatten(SAMPLE_KEYS[2][1]), savedAt: 0 },
  { id: "sample-3x3-1", name: "Sample 3×3 #1", size: 3, cells: flatten(SAMPLE_KEYS[3][0]), savedAt: 0 },
];

export default function MatrixCipher() {
  const [size, setSize] = useState<2 | 3>(2);
  const [cells, setCells] = useState<string[]>(flatten(SAMPLE_KEYS[2][0]));
  const [savedKeys, setSavedKeys] = useLocalStorage<SavedKey[]>("matrix_keys", () => DEFAULT_MATRIX_KEYS);
  const [keyName, setKeyName] = useState("");
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [plain, setPlain] = useState("SECRET CODE");
  const [cipherIn, setCipherIn] = useState("");
  const [removeSpaces, setRemoveSpaces] = useState(false);
  const [uppercaseOnly, setUppercaseOnly] = useState(true);
  const [showCheck, setShowCheck] = useState(true);
  const [showSteps, setShowSteps] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const changeSize = (n: 2 | 3) => {
    setSize(n);
    setCells(flatten(SAMPLE_KEYS[n][0]));
  };

  const valid = cells.length === size * size && cells.every((c) => c.trim() !== "" && Number.isFinite(Number(c)));

  const key = useMemo(() => {
    const nums = cells.map((c) => (c.trim() === "" ? NaN : Math.trunc(Number(c))));
    const m: number[][] = [];
    for (let i = 0; i < size; i++) m.push(nums.slice(i * size, i * size + size));
    return m;
  }, [cells, size]);

  const check = useMemo(() => (valid ? checkKey(key, MOD) : null), [key, valid]);

  const enc = useMemo(
    () => (valid ? matrixEncode(plain, key, uppercaseOnly, MOD) : null),
    [plain, key, uppercaseOnly, valid],
  );
  const encOut = enc ? formatNumbers(enc.numbers, removeSpaces) : "";

  const dec = useMemo(() => (valid ? matrixDecode(cipherIn, key, MOD) : null), [cipherIn, key, valid]);

  const flash = (m: string) => {
    setKeyMsg(m);
    window.setTimeout(() => setKeyMsg(null), 2200);
  };

  const saveKey = () => {
    if (!valid) return flash("Fill the whole matrix before saving.");
    const name = (keyName.trim() || `Key ${savedKeys.length + 1}`).slice(0, 32);
    const existing = savedKeys.find((k) => k.name.toLowerCase() === name.toLowerCase());
    const entry: SavedKey = {
      id: existing?.id ?? Math.random().toString(36).slice(2, 10),
      name,
      size,
      cells: [...cells].slice(0, size * size),
      savedAt: Date.now(),
    };
    setSavedKeys(existing ? savedKeys.map((k) => (k.id === existing.id ? entry : k)) : [...savedKeys, entry]);
    setKeyName("");
    flash(existing ? `Updated “${name}” ✔` : `Saved “${name}” ✔`);
  };

  const loadKey = (k: SavedKey) => {
    setSize(k.size as 2 | 3);
    setCells([...k.cells]);
    flash(`Loaded “${k.name}”`);
  };

  const randomiseKey = () => {
    for (let attempt = 0; attempt < 800; attempt++) {
      const candidate: number[][] = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => Math.floor(Math.random() * 100)),
      );
      if (inverseMod(candidate, MOD)) {
        setCells(flatten(candidate));
        return;
      }
    }
  };

  const cellCls =
    "h-14 w-full rounded-xl border border-white/15 bg-black/50 text-center font-mono text-lg text-cyan-200 outline-none transition-all focus:border-cyan-400 focus:bg-cyan-500/10 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* ------------- key matrix ------------- */}
        <Card>
          <CardTitle
            icon="🧮"
            title="Key matrix"
            sub={`Hill cipher · mod ${MOD}`}
            right={<Segmented value={String(size)} onChange={(v) => changeSize(Number(v) as 2 | 3)} options={[{ value: "2", label: "2 × 2" }, { value: "3", label: "3 × 3" }]} />}
          />

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-4">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: size * size }).map((_, i) => (
                <input
                  key={i}
                  value={cells[i] ?? ""}
                  inputMode="numeric"
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9-]/g, "");
                    setCells((c) => {
                      const next = [...c];
                      while (next.length < size * size) next.push("");
                      next[i] = v;
                      return next;
                    });
                  }}
                  className={cellCls}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Btn size="sm" variant="primary" onClick={() => setShowCheck((v) => !v)}>
              🔍 Check Matrix
            </Btn>
            <Btn size="sm" variant="ghost" onClick={randomiseKey}>
              🎲 Random valid key
            </Btn>
            {SAMPLE_KEYS[size].map((k, i) => (
              <Btn key={i} size="sm" variant="ghost" onClick={() => setCells(flatten(k))}>
                Sample {i + 1}
              </Btn>
            ))}
            <CopyBtn value={key.map((r) => r.join(" ")).join("\n")} label="Copy key" size="sm" />
            <PasteBtn
              size="sm"
              onPaste={(v) => {
                const nums = v.match(/-?\d+/g);
                if (!nums) return;
                if (nums.length >= 9 && size === 2) setSize(3);
                const need = nums.length >= 9 ? 9 : 4;
                if (nums.length >= need) setCells(nums.slice(0, need));
              }}
            />
          </div>

          {!valid && <div className="mt-3"><Note tone="error">Fill every cell of the {size}×{size} matrix with a number.</Note></div>}

          {/* ---------- save / load keys ---------- */}
          <div className="mt-4 rounded-xl border border-violet-400/25 bg-gradient-to-br from-violet-500/10 to-transparent p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-widest text-violet-200 uppercase">💾 Saved keys</span>
              <div className="flex items-center gap-2">
                {keyMsg && <span className="text-[11px] text-emerald-300">{keyMsg}</span>}
                <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
                  ✓ Local save
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveKey()}
                placeholder="Key name (e.g. My Key 1)"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/60"
              />
              <Btn size="sm" variant="primary" onClick={saveKey} disabled={!valid}>
                💾 Save key
              </Btn>
            </div>

            {savedKeys.length === 0 ? (
              <p className="mt-2 text-[11px] text-slate-500">
                Key matrix එකක් මේ device එකේ save කරලා, පස්සේ එක click එකකින් load කරගන්න පුළුවන්.
              </p>
            ) : (
              <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {savedKeys.map((k) => {
                  const isCurrent = k.size === size && k.cells.join(",") === cells.slice(0, size * size).join(",");
                  return (
                    <div
                      key={k.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
                        isCurrent ? "border-violet-400/50 bg-violet-500/15" : "border-white/10 bg-black/25 hover:border-white/25",
                      )}
                    >
                      <button onClick={() => loadKey(k)} className="min-w-0 flex-1 text-left" title="Load this key">
                        <span className="block truncate text-xs font-medium text-slate-200">
                          {k.name} {isCurrent && <span className="text-violet-300">· in use</span>}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-slate-500">
                          {k.size}×{k.size} · [{k.cells.join(", ")}]
                        </span>
                      </button>
                      <Btn size="xs" variant="ghost" onClick={() => loadKey(k)}>
                        ↥ Load
                      </Btn>
                      <CopyBtn value={k.cells.join(" ")} label="" />
                      <button
                        title="Rename"
                        className="rounded p-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          const n = window.prompt("Key name", k.name);
                          if (n) setSavedKeys(savedKeys.map((x) => (x.id === k.id ? { ...x, name: n } : x)));
                        }}
                      >
                        ✎
                      </button>
                      <button
                        title="Delete"
                        className="rounded p-1 text-xs text-rose-400 hover:bg-rose-500/20"
                        onClick={() => setSavedKeys(savedKeys.filter((x) => x.id !== k.id))}
                      >
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {showCheck && check && (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Determinant" value={String(check.det)} />
                <Stat label={`det mod ${MOD}`} value={String(check.detMod)} />
                <Stat label={`gcd(det, ${MOD})`} value={String(check.g)} />
                <Stat label="Status" value={check.invertible ? "Invertible" : "Not invertible"} tone={check.invertible ? "ok" : "bad"} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-center">
                  <div className="text-[10px] tracking-widest text-emerald-300/70 uppercase">Encode</div>
                  <div className="text-sm font-semibold text-emerald-300">Available ✔</div>
                </div>
                <div
                  className={cn(
                    "rounded-xl border px-3 py-2 text-center",
                    check.invertible ? "border-emerald-500/25 bg-emerald-500/10" : "border-rose-500/25 bg-rose-500/10",
                  )}
                >
                  <div className={cn("text-[10px] tracking-widest uppercase", check.invertible ? "text-emerald-300/70" : "text-rose-300/70")}>
                    Decode
                  </div>
                  <div className={cn("text-sm font-semibold", check.invertible ? "text-emerald-300" : "text-rose-300")}>
                    {check.invertible ? "Available ✔" : "Not possible ✖"}
                  </div>
                </div>
              </div>

              <Note tone={check.invertible ? "ok" : "warn"}>
                {check.messages.map((m, i) => (
                  <div key={i}>{m}</div>
                ))}
                {!check.invertible && (
                  <div className="mt-1 text-amber-200/80">
                    Tip: mod 100 වැඩ කරන්න determinant එක 2න් හෝ 5න් බෙදෙන්නේ නැති (odd &amp; not ending in 5) අගයක් වෙන්න ඕන.
                  </div>
                )}
              </Note>

              {check.inverse && (
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                      Inverse key (mod {MOD})
                    </span>
                    <CopyBtn value={check.inverse.map((r) => r.join(" ")).join("\n")} />
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))` }}>
                    {check.inverse.flat().map((v, i) => (
                      <div key={i} className="rounded-lg bg-violet-500/10 py-2 text-center font-mono text-sm text-violet-200">
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ------------- encode / decode ------------- */}
        <div className="space-y-5">
          <Card>
            <CardTitle
              icon="🔐"
              title="Matrix encode"
              sub="Text → 2-digit codes → K × block (mod 100)"
              right={
                <Toggle
                  checked={uppercaseOnly}
                  onChange={setUppercaseOnly}
                  label="Uppercase only"
                  hint="a → A before encoding"
                />
              }
            />
            <div className="space-y-3">
              <IOBox label="Plain text" value={plain} onChange={setPlain} rows={3} accent="cyan" placeholder="Type your message…" />

              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all",
                  removeSpaces
                    ? "border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 to-violet-500/15 shadow-lg shadow-cyan-500/10"
                    : "border-white/10 bg-white/[0.03]",
                )}
              >
                <input
                  id="rmspace"
                  type="checkbox"
                  checked={removeSpaces}
                  onChange={(e) => setRemoveSpaces(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-cyan-400"
                />
                <label htmlFor="rmspace" className="flex-1 cursor-pointer">
                  <span className="block text-sm font-medium text-white">Remove spaces from Matrix output</span>
                  <span className="block text-[11px] text-slate-400">
                    Tick කළාම numbers ටික spaces නැතුව එකට එනවා · {removeSpaces ? "07421205…" : "07 42 12 05 …"}
                  </span>
                </label>
              </div>

              <IOBox
                label="Matrix output"
                hint={enc ? `${enc.numbers.length} numbers` : ""}
                value={encOut}
                rows={3}
                mono
                accent="violet"
                extraActions={
                  <Btn size="xs" variant="ghost" onClick={() => setCipherIn(encOut)} title="Send to decoder">
                    ↧ To decode
                  </Btn>
                }
                footer={
                  enc && (enc.skipped.length || enc.padded) ? (
                    <span className="text-amber-300">
                      {enc.padded ? `Padded with ${enc.padded} space code(s). ` : ""}
                      {enc.skipped.length ? `Skipped: ${[...new Set(enc.skipped)].slice(0, 10).join(" ")}` : ""}
                    </span>
                  ) : (
                    <span className="text-slate-500">Each character = 2 digits (00–99)</span>
                  )
                }
              />

              <div className="flex flex-wrap items-center gap-2">
                <Btn size="sm" variant="ghost" onClick={() => setShowSteps((v) => !v)}>
                  {showSteps ? "Hide" : "Show"} working steps
                </Btn>
                {enc && (
                  <CopyBtn value={enc.codes.map(format2).join(" ")} label="Copy plain codes" size="sm" />
                )}
              </div>

              {showSteps && enc && (
                <div className="max-h-64 overflow-auto rounded-xl border border-white/10">
                  <table className="w-full border-collapse font-mono text-xs">
                    <thead className="sticky top-0 bg-slate-900/95 text-[10px] tracking-widest text-slate-400 uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Block</th>
                        <th className="px-3 py-2 text-left">Chars</th>
                        <th className="px-3 py-2 text-left">Codes (P)</th>
                        <th className="px-3 py-2 text-left">K·P mod {MOD}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enc.blocks.map((b, i) => (
                        <tr key={i} className={cn("border-t border-white/5", i % 2 && "bg-white/[0.02]")}>
                          <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                          <td className="px-3 py-1.5 text-cyan-300">
                            {b.inVec.map((c) => (CODE_TABLE[c] === " " ? "␣" : CODE_TABLE[c])).join(" ")}
                          </td>
                          <td className="px-3 py-1.5 text-emerald-200">{b.inVec.map(format2).join(" ")}</td>
                          <td className="px-3 py-1.5 text-violet-200">{b.outVec.map(format2).join(" ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle icon="🔓" title="Matrix decode" sub="Numbers → K⁻¹ × block (mod 100) → text" />
            <div className="space-y-3">
              <IOBox
                label="Number code"
                hint="with or without spaces"
                value={cipherIn}
                onChange={setCipherIn}
                rows={3}
                mono
                accent="amber"
                placeholder="e.g. 07 42 12 05  or  07421205"
              />
              {dec?.error ? (
                <Note tone="error">{dec.error}</Note>
              ) : (
                <IOBox label="Decoded text" value={dec?.text ?? ""} rows={2} accent="emerald" />
              )}
              {dec && dec.blocks.length > 0 && !dec.error && (
                <div className="text-[11px] text-slate-500">
                  {dec.blocks.length} block(s) · plain codes: <span className="font-mono text-slate-400">{dec.codes.map(format2).join(" ")}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardTitle
          icon="🔠"
          title="Character ↔ code table (mod 100)"
          sub="Space = 00, A–Z = 01–26, digits = 27–36, punctuation, a–z = 50–75 …"
          right={
            <>
              <Btn size="sm" variant="ghost" onClick={() => setShowTable((v) => !v)}>
                {showTable ? "Hide table" : "Show table"}
              </Btn>
              <CopyBtn value={CODE_TABLE.map((c, i) => `${format2(i)} = ${c === " " ? "SPACE" : c === "\n" ? "\\n" : c}`).join("\n")} label="Copy table" size="sm" />
            </>
          }
        />
        {showTable && (
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 lg:grid-cols-10">
            {CODE_TABLE.map((c, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-black/30 px-1 py-1.5 text-center">
                <div className="font-mono text-xs text-slate-500">{format2(i)}</div>
                <div className="font-mono text-sm text-cyan-200">{c === " " ? "␣" : c === "\n" ? "⏎" : c === "\t" ? "⇥" : c}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <div className="text-[10px] tracking-widest text-slate-500 uppercase">{label}</div>
      <div
        className={cn(
          "font-mono text-sm font-semibold",
          tone === "ok" ? "text-emerald-300" : tone === "bad" ? "text-rose-300" : "text-slate-100",
        )}
      >
        {value}
      </div>
    </div>
  );
}
