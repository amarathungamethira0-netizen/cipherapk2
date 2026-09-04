import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./ui";
import { ACCESS_CODE, AUTH_FLAG_KEY, AUTH_FLAG_VALUE } from "../lib/access";

function readFlag(): boolean {
  try {
    return (
      window.sessionStorage.getItem(AUTH_FLAG_KEY) === AUTH_FLAG_VALUE ||
      window.localStorage.getItem(AUTH_FLAG_KEY) === AUTH_FLAG_VALUE
    );
  } catch {
    return false;
  }
}

export function lockSite() {
  try {
    window.sessionStorage.removeItem(AUTH_FLAG_KEY);
    window.localStorage.removeItem(AUTH_FLAG_KEY);
  } catch {
    /* ignore */
  }
  window.location.reload();
}

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean>(() => readFlag());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!unlocked) inputRef.current?.focus();
  }, [unlocked]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    // tiny delay = feels deliberate + throttles brute forcing
    window.setTimeout(() => {
      if (code.trim() === ACCESS_CODE) {
        try {
          window.sessionStorage.setItem(AUTH_FLAG_KEY, AUTH_FLAG_VALUE);
          if (remember) window.localStorage.setItem(AUTH_FLAG_KEY, AUTH_FLAG_VALUE);
        } catch {
          /* ignore */
        }
        setError(null);
        setUnlocked(true);
      } else {
        setError("Incorrect access code!");
        setAttempts((a) => a + 1);
        setShake(true);
        setCode("");
        window.setTimeout(() => setShake(false), 500);
        inputRef.current?.focus();
      }
      setBusy(false);
    }, 260);
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05060c] px-4 py-10">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-glow absolute -top-32 -left-24 h-[26rem] w-[26rem] rounded-full bg-cyan-600/25 blur-[120px]" />
        <div className="animate-float-glow absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-violet-600/25 blur-[130px] [animation-delay:-6s]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 100%)",
          }}
        />
      </div>

      <div
        className={cn(
          "animate-fade-up relative w-full max-w-md rounded-3xl border border-white/12 bg-white/[0.045] p-7 shadow-2xl shadow-black/50 backdrop-blur-xl",
          shake && "animate-[shake_0.45s_ease-in-out]",
        )}
        style={shake ? { animation: "shake 0.45s ease-in-out" } : undefined}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-600 text-3xl shadow-lg shadow-cyan-500/30">
            🔒
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Cipher<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">Lab</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">Protected workspace · enter your access code</p>
          <p className="mt-1 text-xs text-slate-500">ඇතුළු වෙන්න access code එක ටයිප් කරන්න</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
              Access code
            </label>
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-black/45 px-3 transition-all",
                error ? "border-rose-500/60 shadow-[0_0_0_3px_rgba(244,63,94,0.12)]" : "border-white/12 focus-within:border-cyan-400/60 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.12)]",
              )}
            >
              <span className="text-slate-500">🔑</span>
              <input
                ref={inputRef}
                type={show ? "text" : "password"}
                inputMode="numeric"
                autoComplete="off"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••••••"
                className="w-full bg-transparent py-3 font-mono text-lg tracking-[0.25em] text-slate-100 outline-none placeholder:tracking-[0.2em] placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
                title={show ? "Hide" : "Show"}
              >
                {show ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/12 px-3 py-2.5 text-sm text-rose-200">
              <span>⛔</span>
              <span className="flex-1">{error}</span>
              {attempts > 1 && <span className="text-[11px] text-rose-300/70">{attempts} tries</span>}
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-cyan-400"
            />
            Keep me unlocked on this device
          </label>

          <button
            type="submit"
            disabled={!code.trim() || busy}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Checking…" : "🔓 Unlock"}
          </button>
        </form>

        <p className="mt-5 border-t border-white/10 pt-4 text-center text-[11px] leading-relaxed text-slate-500">
          Your mapping lists &amp; key matrices are stored locally,
          <br />
          and the entire app works without an internet connection.
        </p>
      </div>
    </div>
  );
}
