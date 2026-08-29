import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search, Download, Columns,
  Inbox, CheckCircle2, AlertTriangle, Info, AlertOctagon, ArrowUpDown,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Tone } from "../lib/utils";
import { exportCSV } from "../lib/utils";
import { useApp } from "../lib/store";

// ---------------- Botões ----------------
const btnBase =
  "inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pine-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
const btnVariants: Record<string, string> = {
  primary: "bg-pine-700 text-white hover:bg-pine-800 shadow-sm",
  secondary: "bg-white text-ink-700 border border-slate-300 hover:border-pine-500 hover:text-pine-700",
  ghost: "text-ink-500 hover:bg-slate-200/60 hover:text-ink-900",
  danger: "bg-red-700 text-white hover:bg-red-800 shadow-sm",
  warn: "bg-amber-600 text-white hover:bg-amber-700 shadow-sm",
  subtle: "bg-pine-50 text-pine-700 hover:bg-pine-100",
};
const btnSizes: Record<string, string> = {
  xs: "text-[11px] px-2 py-1",
  sm: "text-xs px-2.5 py-1.5",
  md: "text-[13px] px-3.5 py-2",
};

export function Button({
  variant = "primary", size = "md", className = "", children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof btnVariants; size?: keyof typeof btnSizes }) {
  return (
    <button className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

// ---------------- Badge ----------------
const toneCls: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/25",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/30",
  danger: "bg-red-50 text-red-700 ring-red-600/25",
  info: "bg-sky-50 text-sky-700 ring-sky-600/25",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/25",
  accent: "bg-pine-50 text-pine-700 ring-pine-600/25",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-600/25",
  orange: "bg-orange-50 text-orange-700 ring-orange-600/25",
};

export function Badge({ tone = "neutral", children, dot = false, className = "" }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${toneCls[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current pulse-dot" />}
      {children}
    </span>
  );
}

// ---------------- Placa Mercosul ----------------
export function Plate({ placa, small = false }: { placa: string; small?: boolean }) {
  return (
    <span className="inline-flex flex-col overflow-hidden rounded-[4px] border border-slate-300 bg-white leading-none shadow-[0_1px_2px_rgba(0,0,0,0.08)] select-none">
      <span className={`bg-[#14357f] text-center font-bold tracking-[0.18em] text-white ${small ? "text-[5px] px-1 py-[1px]" : "text-[6px] px-1.5 py-0.5"}`}>BRASIL</span>
      <span className={`font-mono font-bold text-slate-900 ${small ? "text-[9px] px-1 py-[2px]" : "text-[11px] px-1.5 py-[3px]"}`}>{placa}</span>
    </span>
  );
}

// ---------------- Cards / cabeçalhos ----------------
export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-lg border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(16,32,26,0.05)] ${className}`}>{children}</div>;
}

export function CardHead({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <div>
        <h3 className="font-display text-[15px] font-bold text-ink-900">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-ink-500">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink-900">{title}</h1>
        {sub && <p className="mt-1 text-[13px] text-ink-500">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">{children}</div>;
}

// ---------------- Formulário ----------------
export function Field({ label, req, error, children, className = "", hint }: { label: string; req?: boolean; error?: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-ink-700">
        {label} {req && <span className="text-red-600">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-ink-300">{hint}</span>}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600">
          <AlertTriangle className="h-3 w-3" /> {error}
        </span>
      )}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-ink-900 placeholder:text-slate-400 transition-colors focus:border-pine-600 focus:outline-none focus:ring-2 focus:ring-pine-500/25 disabled:bg-slate-50 disabled:text-ink-300";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = props;
  return <input className={`${inputCls} ${invalid ? "border-red-400 bg-red-50/40" : ""} ${className ?? ""}`} {...rest} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  const { className, children, invalid, ...rest } = props;
  return (
    <select className={`${inputCls} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[right_8px_center] bg-no-repeat pr-7 ${invalid ? "border-red-400 bg-red-50/40" : ""} ${className ?? ""}`} {...rest}>
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  const { className, invalid, ...rest } = props;
  return <textarea className={`${inputCls} min-h-[72px] ${invalid ? "border-red-400 bg-red-50/40" : ""} ${className ?? ""}`} {...rest} />;
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-700">
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${on ? "bg-pine-600" : "bg-slate-300"}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-1"}`} />
      </span>
      {label}
    </button>
  );
}

export function ProgressBar({ value, tone = "accent", h = "h-1.5" }: { value: number; tone?: Tone | "auto"; h?: string }) {
  const v = Math.min(100, Math.max(0, value));
  const color =
    tone === "auto"
      ? v >= 100 ? "bg-red-600" : v >= 85 ? "bg-amber-500" : "bg-pine-600"
      : { success: "bg-emerald-600", warning: "bg-amber-500", danger: "bg-red-600", info: "bg-sky-600", neutral: "bg-slate-400", accent: "bg-pine-600", cyan: "bg-cyan-600", orange: "bg-orange-500" }[tone];
  return (
    <div className={`${h} w-full overflow-hidden rounded-full bg-slate-200`}>
      <div className={`${color} anim-grow-bar h-full rounded-full`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className={`h-3.5 w-3.5 ${i <= Math.round(value) ? "fill-amber-400" : "fill-slate-200"}`}>
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
        </svg>
      ))}
      <span className="ml-1 text-[11px] font-semibold text-ink-500">{value.toLocaleString("pt-BR")}</span>
    </span>
  );
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-200 py-1.5 text-[13px] last:border-0">
      <span className="shrink-0 text-ink-500">{k}</span>
      <span className="text-right font-medium text-ink-900">{v ?? "—"}</span>
    </div>
  );
}

// ---------------- Modal / Drawer ----------------
export function Modal({ open, onClose, title, children, wide = false, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-pine-950/50 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`relative flex max-h-[92vh] w-full flex-col rounded-xl bg-white shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-ink-900">{title}</h2>
              <button onClick={onClose} className="rounded-md p-1 text-ink-500 hover:bg-slate-100 hover:text-ink-900"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, width = "max-w-2xl" }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: string }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-pine-950/50 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl ${width}`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="font-display text-[15px] font-bold text-ink-900">{title}</div>
              <button onClick={onClose} className="rounded-md p-1 text-ink-500 hover:bg-slate-100 hover:text-ink-900"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ---------------- Tabs ----------------
export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; badge?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-200/60 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            active === t.id ? "bg-white text-pine-800 shadow-sm" : "text-ink-500 hover:text-ink-900"
          }`}
        >
          {t.label}
          {t.badge !== undefined && t.badge > 0 && (
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${active === t.id ? "bg-pine-100 text-pine-800" : "bg-slate-300/70 text-ink-700"}`}>{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------- Estado vazio ----------------
export function EmptyState({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Inbox className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {sub && <p className="max-w-sm text-xs text-ink-500">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------------- Tabela padrão ----------------
export interface Col<T> {
  key: string;
  label: string;
  render?: (r: T) => ReactNode;
  sortVal?: (r: T) => string | number;
  align?: "left" | "right" | "center";
  width?: string;
}

export function DataTable<T extends { id: string }>({
  tableId, rows, cols, defaultPageSize = 10, onRowClick, extraToolbar, defaultSearch = "",
}: {
  tableId: string;
  rows: T[];
  cols: Col<T>[];
  defaultPageSize?: number;
  onRowClick?: (r: T) => void;
  extraToolbar?: ReactNode;
  defaultSearch?: string;
}) {
  const [query, setQuery] = useState(defaultSearch);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [hidden, setHidden] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`tbl-${tableId}-cols`) || "[]"); } catch { return []; }
  });
  const [colsOpen, setColsOpen] = useState(false);
  const colsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(`tbl-${tableId}-cols`, JSON.stringify(hidden)); }, [hidden, tableId]);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  useEffect(() => { setPage(0); }, [query, pageSize]);

  const visibleCols = cols.filter((c) => !hidden.includes(c.key));

  const filtered = useMemo(() => {
    let out = rows;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    }
    if (sort) {
      const col = cols.find((c) => c.key === sort.key);
      if (col?.sortVal) {
        out = [...out].sort((a, b) => {
          const va = col.sortVal!(a); const vb = col.sortVal!(b);
          return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
        });
      }
    }
    return out;
  }, [rows, query, sort, cols]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const doExport = () => {
    exportCSV(
      tableId,
      visibleCols.map((c) => c.label),
      filtered.map((r) => visibleCols.map((c) => {
        const v = c.sortVal ? c.sortVal(r) : (r as Record<string, unknown>)[c.key];
        return typeof v === "object" ? JSON.stringify(v) : (v as string | number) ?? "";
      })),
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nesta tabela…"
            className={`${inputCls} pl-8`}
          />
        </div>
        {extraToolbar}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative" ref={colsRef}>
            <Button variant="secondary" size="sm" onClick={() => setColsOpen((v) => !v)} type="button">
              <Columns className="h-3.5 w-3.5" /> Colunas
            </Button>
            {colsOpen && (
              <div className="anim-pop absolute right-0 z-30 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {cols.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-ink-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={!hidden.includes(c.key)}
                      onChange={() =>
                        setHidden((h) => (h.includes(c.key) ? h.filter((x) => x !== c.key) : [...h, c.key]))
                      }
                      className="accent-pine-600"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={doExport} type="button">
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {visibleCols.map((c) => (
                <th key={c.key} className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-500 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`} style={c.width ? { width: c.width } : undefined}>
                  {c.sortVal ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-pine-700"
                      onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}
                    >
                      {c.label}
                      {sort?.key === c.key
                        ? sort.dir === 1 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr
                key={r.id}
                onClick={() => onRowClick?.(r)}
                className={`border-b border-slate-100 last:border-0 ${onRowClick ? "cursor-pointer" : ""} transition-colors hover:bg-pine-50/50`}
              >
                {visibleCols.map((c) => (
                  <td key={c.key} className={`px-3 py-2.5 align-middle ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}>
                    {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr><td colSpan={visibleCols.length}><EmptyState title="Nenhum registro encontrado" sub="Ajuste os filtros ou o termo de busca para localizar registros." /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
        <div className="flex items-center gap-2">
          <span>Exibindo <b className="text-ink-900">{filtered.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)}</b> de <b className="text-ink-900">{filtered.length}</b></span>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs">
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}/pág.</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)} type="button"><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <span className="num px-1 font-semibold text-ink-700">{page + 1} / {pages}</span>
          <Button variant="ghost" size="xs" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} type="button"><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Toasts ----------------
export function ToastHost() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => dismiss(toasts[0].id), 4600);
    return () => clearTimeout(t);
  }, [toasts, dismiss]);
  const meta = {
    sucesso: { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-800", bar: "bg-emerald-600" },
    erro: { icon: AlertOctagon, cls: "border-red-200 bg-red-50 text-red-800", bar: "bg-red-600" },
    aviso: { icon: AlertTriangle, cls: "border-amber-200 bg-amber-50 text-amber-800", bar: "bg-amber-500" },
    info: { icon: Info, cls: "border-sky-200 bg-sky-50 text-sky-800", bar: "bg-sky-600" },
  };
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(92vw,380px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const M = meta[t.tipo];
          const Icon = M.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto relative flex items-start gap-2.5 overflow-hidden rounded-lg border px-3.5 py-3 shadow-lg ${M.cls}`}
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${M.bar}`} />
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 text-[13px] font-medium leading-snug">{t.msg}</p>
              <button onClick={() => dismiss(t.id)} className="opacity-50 transition-opacity hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
