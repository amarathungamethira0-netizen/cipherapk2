import { useEffect, useRef, useState, type ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { copyText, pasteText } from "../lib/clipboard";

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

/* ----------------------------- Buttons ----------------------------- */

export function Btn({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  className,
  title,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "soft" | "danger" | "success";
  size?: "xs" | "sm" | "md";
  className?: string;
  title?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 select-none whitespace-nowrap";
  const sizes = {
    xs: "px-2 py-1 text-[11px]",
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };
  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20 hover:brightness-110",
    ghost: "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-white/20",
    soft: "bg-white/10 text-slate-100 hover:bg-white/20",
    danger: "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
    success: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
  };
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled} className={cn(base, sizes[size], variants[variant], className)}>
      {children}
    </button>
  );
}

/* --------------------------- Copy / Paste --------------------------- */

export function CopyBtn({ value, size = "xs", label = "Copy" }: { value: string; size?: "xs" | "sm"; label?: string }) {
  const [done, setDone] = useState(false);
  const t = useRef<number | null>(null);
  useEffect(() => () => { if (t.current) window.clearTimeout(t.current); }, []);
  return (
    <Btn
      size={size}
      variant={done ? "success" : "ghost"}
      title="Copy to clipboard"
      onClick={async () => {
        const ok = await copyText(value);
        setDone(ok);
        if (t.current) window.clearTimeout(t.current);
        t.current = window.setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? "✓ Copied" : `⧉ ${label}`}
    </Btn>
  );
}

export function PasteBtn({ onPaste, size = "xs" }: { onPaste: (v: string) => void; size?: "xs" | "sm" }) {
  const [err, setErr] = useState(false);
  return (
    <Btn
      size={size}
      variant={err ? "danger" : "ghost"}
      title="Paste from clipboard (Ctrl+V works too)"
      onClick={async () => {
        const v = await pasteText();
        if (v === null) {
          setErr(true);
          window.setTimeout(() => setErr(false), 1800);
          return;
        }
        onPaste(v);
      }}
    >
      {err ? "⌘V please" : "⤓ Paste"}
    </Btn>
  );
}

/* ------------------------------ Cards ------------------------------ */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ icon, title, sub, right }: { icon?: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        {icon && <span className="text-lg leading-6">{icon}</span>}
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-white uppercase">{title}</h3>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/* ------------------------------ IO box ------------------------------ */

export function IOBox({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 4,
  accent = "cyan",
  mono = false,
  footer,
  extraActions,
  minimal,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  rows?: number;
  accent?: "cyan" | "violet" | "emerald" | "amber";
  mono?: boolean;
  footer?: ReactNode;
  extraActions?: ReactNode;
  minimal?: boolean;
}) {
  const ring = {
    cyan: "focus-within:border-cyan-400/50 focus-within:shadow-cyan-500/10",
    violet: "focus-within:border-violet-400/50 focus-within:shadow-violet-500/10",
    emerald: "focus-within:border-emerald-400/50 focus-within:shadow-emerald-500/10",
    amber: "focus-within:border-amber-400/50 focus-within:shadow-amber-500/10",
  }[accent];
  const dot = { cyan: "bg-cyan-400", violet: "bg-violet-400", emerald: "bg-emerald-400", amber: "bg-amber-400" }[accent];

  return (
    <div className={cn("rounded-xl border border-white/10 bg-black/30 shadow-lg transition-all", ring)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          <span className="text-[11px] font-semibold tracking-widest text-slate-300 uppercase">{label}</span>
          {hint && <span className="text-[11px] text-slate-500">· {hint}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {extraActions}
          {onChange && <PasteBtn onPaste={(v) => onChange(v)} />}
          {onChange && !minimal && (
            <Btn size="xs" variant="ghost" title="Clear" onClick={() => onChange("")}>
              ✕ Clear
            </Btn>
          )}
          <CopyBtn value={value} />
        </div>
      </div>
      <textarea
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={!onChange}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        className={cn(
          "w-full resize-y bg-transparent px-3 py-2.5 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-600",
          mono && "font-mono text-[13px] tracking-wide break-all",
          !onChange && "text-slate-200",
        )}
      />
      {footer && <div className="border-t border-white/5 px-3 py-1.5 text-[11px] text-slate-400">{footer}</div>}
    </div>
  );
}

/* --------------------------- Small inputs --------------------------- */

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors hover:bg-white/[0.07]">
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-gradient-to-r from-cyan-500 to-violet-500" : "bg-slate-700",
        )}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-[1.15rem]" : "left-0.5",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-slate-200">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Labeled({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-semibold tracking-widest text-slate-400 uppercase">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/50";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            value === o.value
              ? "bg-gradient-to-r from-cyan-500/90 to-violet-500/90 text-white shadow"
              : "text-slate-400 hover:text-slate-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Note({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const tones = {
    info: "border-sky-500/25 bg-sky-500/10 text-sky-200",
    warn: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    error: "border-rose-500/25 bg-rose-500/10 text-rose-200",
    ok: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  }[tone];
  const icon = { info: "ℹ", warn: "⚠", error: "✕", ok: "✓" }[tone];
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed", tones)}>
      <span className="mt-px">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
