import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import CustomCipher from "./sections/CustomCipher";
import BaseConverter from "./sections/BaseConverter";
import MatrixCipher from "./sections/MatrixCipher";
import { cn } from "./components/ui";
import { lockSite } from "./components/PasswordGate";

type TabKey = "cipher" | "base" | "matrix";

const TABS: { key: TabKey; no: string; title: string; sub: string; icon: string }[] = [
  { key: "cipher", no: "01", title: "Custom Cipher", sub: "Your own secret code list", icon: "🔐" },
  { key: "base", no: "02", title: "Base Converter", sub: "Bin · Dec · Oct · Hex", icon: "🔢" },
  { key: "matrix", no: "03", title: "Matrix Cipher", sub: "Hill cipher · mod 100", icon: "🧮" },
];

const HELP: Record<TabKey, string[]> = {
  cipher: [
    "Mapping table එකේ Character(s) column එකට අකුරු 1ක් හෝ 2ක් (උදා: a හෝ th) දාන්න.",
    "“Codes per character” එකෙන් එක අකුරකට codes කීයක් දෙනවද කියලා (1–8) වැඩි/අඩු කරගන්න. එකකට වඩා දුන්නොත් encode වෙද්දී ඒවායින් එකක් random විදිහට තෝරාගනී — 🎲 Re-roll එබුවම අලුත් combination එකක්.",
    "ලැයිස්තු කීපයක් හදලා save කරගන්න පුළුවන්. ඒවා මේ Android device එකේ localStorage එකට auto-save වෙනවා.",
    "Separator එක තෝරන්න — codes දිග වෙනස් නම් space හෝ dash එකක් යොදාගැනීම decode නිවැරදි වෙන්න උදව් වෙනවා.",
  ],
  base: [
    "Input text එකට type කළ ගමන් Binary, Decimal, Octal, Hexadecimal හතරම එකවර පෙන්නනවා.",
    "Separator, zero padding, uppercase hex, 0b/0x prefix වගේ options තියෙනවා.",
    "↩️ Back to text කොටසින් binary/dec/oct/hex එකක් ආපහු text එකට හරවන්න පුළුවන්.",
    "Number ⇄ Bases mode එකෙන් සාමාන්‍ය අංකයක් bases හතරටම හරවගන්න පුළුවන් (ලොකු අගයන් BigInt වලින්).",
  ],
  matrix: [
    "Key matrix එක (2×2 හෝ 3×3) fill කරලා 🔍 Check Matrix එබුවම det, gcd සහ encode/decode දෙකටම වැඩ කරනවද කියලා පෙන්නනවා.",
    "mod 100 නිසා det එක 2න් හෝ 5න් බෙදෙන්නේ නැත්නම් විතරයි inverse එක තියෙන්නේ (එතකොට decode කරන්න පුළුවන්).",
    "හැම character එකකටම 2-digit code එකක් (00–99) — table එක පහළින් බලාගන්න පුළුවන්.",
    "“Remove spaces from Matrix output” tick කළාම output එකේ numbers spaces නැතුව එකට එනවා. Decode එකට spaces තිබ්බත් නැතත් දෙකම වැඩ කරනවා.",
    "💾 Saved keys කොටසින් key matrix එකට නමක් දීලා මේ device එකේ save කරලා, පස්සේ ↥ Load කරගන්න පුළුවන්.",
  ],
};

export default function App() {
  const [tab, setTab] = useState<TabKey>("cipher");
  const [showHelp, setShowHelp] = useState(false);
  const current = TABS.find((t) => t.key === tab)!;
  const isAndroid = Capacitor.getPlatform() === "android";

  return (
    <div className="app-shell relative min-h-screen overflow-x-hidden bg-[#05060c] text-slate-100">
      {/* background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-float-glow absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-cyan-600/20 blur-[120px]" />
        <div className="animate-float-glow absolute top-1/3 -right-32 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-[130px] [animation-delay:-6s]" />
        <div className="animate-float-glow absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-fuchsia-600/10 blur-[110px] [animation-delay:-3s]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-3 pb-16 sm:px-6">
        {/* header */}
        <header className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-600 text-2xl shadow-lg shadow-cyan-500/25">
              🛡️
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Cipher<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">Lab</span>
              </h1>
              <p className="text-xs text-slate-400">Secret codes · Number bases · Matrix encryption</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2 text-[11px] text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {isAndroid ? "Android app" : "Offline web app"} · local device storage
            </div>
            <button
              onClick={() => {
                if (window.confirm("Lock CipherLab and require the access code again?")) lockSite();
              }}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
              title="Lock the workspace"
            >
              🔒 Lock
            </button>
          </div>
        </header>

        <div className="mb-4 flex items-start gap-2 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-slate-400">
          <span className="mt-px text-cyan-300">✓</span>
          <span>
            100% offline: mapping lists සහ matrix keys මේ device එකේම save වෙනවා. Internet connection එකක් හෝ cloud account එකක් අවශ්‍ය නැහැ.
          </span>
        </div>

        {/* tabs */}
        <nav className="grid gap-2 sm:grid-cols-3">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200",
                  active
                    ? "border-cyan-400/40 bg-gradient-to-br from-cyan-500/15 via-violet-500/10 to-transparent shadow-xl shadow-cyan-500/10"
                    : "border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest",
                          active ? "bg-cyan-400/20 text-cyan-300" : "bg-white/10 text-slate-400",
                        )}
                      >
                        SECTION {t.no}
                      </span>
                    </div>
                    <div className={cn("mt-1 text-sm font-semibold", active ? "text-white" : "text-slate-300")}>{t.title}</div>
                    <div className="truncate text-[11px] text-slate-500">{t.sub}</div>
                  </div>
                </div>
                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-500" />}
              </button>
            );
          })}
        </nav>

        {/* section header */}
        <div className="mt-6 mb-4 flex items-end justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <div className="font-mono text-[11px] tracking-[0.3em] text-cyan-400/80">SECTION {current.no}</div>
            <h2 className="text-lg font-semibold text-white sm:text-xl">{current.title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right text-[11px] text-slate-500 sm:block">
              හැම input / output එකකටම <span className="text-slate-300">⧉ Copy</span> සහ{" "}
              <span className="text-slate-300">⤓ Paste</span> buttons තියෙනවා
            </span>
            <button
              onClick={() => setShowHelp((v) => !v)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                showHelp
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
              )}
            >
              ❔ How to use
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="animate-fade-up mb-5 rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 to-violet-500/5 p-4">
            <ol className="space-y-2">
              {HELP[tab].map((line, i) => (
                <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-slate-300">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 font-mono text-[10px] text-cyan-300">
                    {i + 1}
                  </span>
                  {line}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* content */}
        <main key={tab} className="animate-fade-up">
          {tab === "cipher" && <CustomCipher />}
          {tab === "base" && <BaseConverter />}
          {tab === "matrix" && <MatrixCipher />}
        </main>

        <footer className="mt-12 border-t border-white/10 pt-5 text-center text-xs text-slate-500">
          CipherLab · fully offline · data stays in this device's localStorage
        </footer>
      </div>
    </div>
  );
}
