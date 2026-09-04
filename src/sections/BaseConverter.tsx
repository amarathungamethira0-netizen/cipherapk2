import { useMemo, useState } from "react";
import { Btn, Card, CardTitle, IOBox, Labeled, Note, Segmented, Toggle, cn, inputCls } from "../components/ui";
import {
  BASES,
  convertNumber,
  decodeFromBase,
  encodeToBase,
  textToUnits,
  type BaseKey,
  type UnitMode,
} from "../lib/baseConvert";

const SEPS = [
  { value: " ", label: "Space" },
  { value: "-", label: "Dash" },
  { value: ", ", label: "Comma" },
  { value: "", label: "None" },
];

export default function BaseConverter() {
  const [mode, setMode] = useState<"text" | "number">("text");

  /* ---------------- text mode ---------------- */
  const [text, setText] = useState("Hello Sri Lanka!");
  const [unit, setUnit] = useState<UnitMode>("utf8");
  const [sep, setSep] = useState(" ");
  const [pad, setPad] = useState(true);
  const [upper, setUpper] = useState(true);
  const [prefix, setPrefix] = useState(false);

  const opts = { mode: unit, pad, separator: sep, uppercase: upper, prefix };
  const outputs = useMemo(
    () => BASES.map((b) => ({ ...b, value: encodeToBase(text, b.key, opts) })),
    [text, unit, sep, pad, upper, prefix],
  );
  const units = useMemo(() => textToUnits(text, unit), [text, unit]);

  /* ---------------- reverse ---------------- */
  const [revBase, setRevBase] = useState<BaseKey>("bin");
  const [revInput, setRevInput] = useState("01001000 01101001");
  const reversed = useMemo(() => decodeFromBase(revInput, revBase, unit), [revInput, revBase, unit]);

  /* ---------------- number mode ---------------- */
  const [numBase, setNumBase] = useState<BaseKey>("dec");
  const [numValue, setNumValue] = useState("2026");
  const numOut = useMemo(() => convertNumber(numValue, numBase), [numValue, numBase]);

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle
          icon="🔢"
          title="Base converter"
          sub="Text එකක් binary / decimal / octal / hexadecimal වලට — ආපහු text එකටත් හරවන්න පුළුවන්."
          right={
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "text", label: "Text ⇄ Bases" },
                { value: "number", label: "Number ⇄ Bases" },
              ]}
            />
          }
        />

        {mode === "text" ? (
          <div className="space-y-4">
            <IOBox
              label="Input text"
              hint={`${Array.from(text).length} chars · ${units.length} ${unit === "utf8" ? "bytes" : "code points"}`}
              value={text}
              onChange={setText}
              rows={3}
              accent="cyan"
              placeholder="Type anything…"
            />

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Labeled label="Unit">
                <select value={unit} onChange={(e) => setUnit(e.target.value as UnitMode)} className={inputCls}>
                  <option value="utf8" className="bg-slate-900">UTF-8 bytes (recommended)</option>
                  <option value="codepoint" className="bg-slate-900">Character code points</option>
                </select>
              </Labeled>
              <Labeled label="Separator">
                <select value={sep} onChange={(e) => setSep(e.target.value)} className={inputCls}>
                  {SEPS.map((s) => (
                    <option key={s.label} value={s.value} className="bg-slate-900">
                      {s.label}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Toggle checked={pad} onChange={setPad} label="Pad with zeros" hint="e.g. 01001000" />
              <Toggle checked={upper} onChange={setUpper} label="Uppercase hex" hint="4F vs 4f" />
            </div>
            <Toggle checked={prefix} onChange={setPrefix} label="Add prefixes (0b / 0o / 0x)" />

            <div className="grid gap-3 lg:grid-cols-2">
              {outputs.map((o) => (
                <IOBox
                  key={o.key}
                  label={o.label}
                  hint={`base ${o.radix}`}
                  value={o.value}
                  rows={3}
                  mono
                  accent={o.key === "bin" ? "violet" : o.key === "dec" ? "emerald" : o.key === "oct" ? "amber" : "cyan"}
                  extraActions={
                    <Btn
                      size="xs"
                      variant="ghost"
                      title="Send to the reverse converter"
                      onClick={() => {
                        setRevBase(o.key);
                        setRevInput(o.value);
                      }}
                    >
                      ↧ Reverse
                    </Btn>
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
              <Labeled label="Input base">
                <select value={numBase} onChange={(e) => setNumBase(e.target.value as BaseKey)} className={inputCls}>
                  {BASES.map((b) => (
                    <option key={b.key} value={b.key} className="bg-slate-900">
                      {b.label} (base {b.radix})
                    </option>
                  ))}
                </select>
              </Labeled>
              <IOBox
                label="Number"
                hint={`enter a ${numBase.toUpperCase()} value`}
                value={numValue}
                onChange={setNumValue}
                rows={1}
                mono
                accent="cyan"
                minimal
              />
            </div>
            {numOut.error && <Note tone="error">{numOut.error}</Note>}
            <div className="grid gap-3 sm:grid-cols-2">
              {BASES.map((b) => (
                <IOBox
                  key={b.key}
                  label={b.label}
                  hint={`base ${b.radix}`}
                  value={numOut.out[b.key]}
                  rows={1}
                  mono
                  accent={b.key === "bin" ? "violet" : b.key === "dec" ? "emerald" : b.key === "oct" ? "amber" : "cyan"}
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      {mode === "text" && (
        <Card>
          <CardTitle icon="↩️" title="Back to text" sub="Binary / Decimal / Octal / Hex → original text" />
          <div className="space-y-3">
            <Segmented
              value={revBase}
              onChange={setRevBase}
              options={BASES.map((b) => ({ value: b.key, label: b.short }))}
            />
            <IOBox
              label={`${revBase.toUpperCase()} input`}
              hint="separated by spaces — or one long string"
              value={revInput}
              onChange={setRevInput}
              rows={3}
              mono
              accent="amber"
            />
            {reversed.error ? (
              <Note tone="error">{reversed.error}</Note>
            ) : (
              <IOBox
                label="Decoded text"
                hint={`${reversed.count} values`}
                value={reversed.text}
                rows={2}
                accent="emerald"
              />
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle icon="📋" title="Character table" sub="First 24 units of your input" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left font-mono text-xs">
            <thead>
              <tr className="text-[10px] tracking-widest text-slate-400 uppercase">
                <th className="px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">Unit</th>
                <th className="px-2 py-1.5">BIN</th>
                <th className="px-2 py-1.5">DEC</th>
                <th className="px-2 py-1.5">OCT</th>
                <th className="px-2 py-1.5">HEX</th>
              </tr>
            </thead>
            <tbody>
              {units.slice(0, 24).map((u, i) => (
                <tr key={i} className={cn("border-t border-white/5", i % 2 && "bg-white/[0.02]")}>
                  <td className="px-2 py-1 text-slate-500">{i + 1}</td>
                  <td className="px-2 py-1 text-cyan-300">
                    {unit === "codepoint" ? (String.fromCodePoint(u) === " " ? "␣" : String.fromCodePoint(u)) : u}
                  </td>
                  <td className="px-2 py-1 text-violet-200">{u.toString(2).padStart(8, "0")}</td>
                  <td className="px-2 py-1 text-emerald-200">{u}</td>
                  <td className="px-2 py-1 text-amber-200">{u.toString(8)}</td>
                  <td className="px-2 py-1 text-sky-200">{u.toString(16).toUpperCase().padStart(2, "0")}</td>
                </tr>
              ))}
              {!units.length && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-slate-500">
                    Type something above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
