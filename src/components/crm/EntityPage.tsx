import { useMemo, useState, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "./AppShell";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "select";
  options?: { value: string; label: string }[];
  step?: string;
};
export type Column<T> = { label: string; render: (r: T) => ReactNode; className?: string };
export type Filter<T> = { label: string; options: { value: string; label: string }[]; match: (r: T, v: string) => boolean };

type Props<T> = {
  title: string;
  singular: string;
  rows: T[];
  idKey: keyof T;
  columns: Column<T>[];
  fields: Field[];
  searchText: (r: T) => string;
  filter?: Filter<T>;
  defaults?: () => Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (form: any, key: string) => Record<string, string>;
  /** Return error message or null on success. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (values: any, id?: number) => string | null;
  onDelete: (id: number) => string | null;
  extraActions?: (r: T) => ReactNode;
  banner?: ReactNode;
};

export const selectCls =
  "h-9 w-full rounded-full border border-input bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function EntityPage<T>(p: Props<T>) {
  const [q, setQ] = useState("");
  const [fv, setFv] = useState("all");
  const [editing, setEditing] = useState<{ id?: number; form: Record<string, string> } | null>(null);

  const visible = useMemo(
    () =>
      p.rows.filter(
        (r) =>
          p.searchText(r).toLowerCase().includes(q.trim().toLowerCase()) &&
          (fv === "all" || !p.filter || p.filter.match(r, fv)),
      ),
    [p, q, fv],
  );

  const openNew = () => setEditing({ form: p.defaults?.() ?? Object.fromEntries(p.fields.map((f) => [f.key, ""])) });
  const openEdit = (r: T) =>
    setEditing({
      id: Number(r[p.idKey]),
      form: Object.fromEntries(p.fields.map((f) => [f.key, String((r as Record<string, unknown>)[f.key] ?? "")])),
    });

  const save = () => {
    if (!editing) return;
    const missing = p.fields.find((f) => !editing.form[f.key]?.trim());
    if (missing) { toast.error(`${missing.label} is required`); return; }
    const err = p.onSave(editing.form, editing.id);
    if (err) { toast.error(err); return; }
    toast.success(`${p.singular} ${editing.id ? "updated" : "created"}`);
    setEditing(null);
  };

  const del = (r: T) => {
    const id = Number(r[p.idKey]);
    if (!confirm(`Delete ${p.singular.toLowerCase()} #${id}?`)) return;
    const err = p.onDelete(id);
    if (err) toast.error(err);
    else toast.success(`${p.singular} deleted`);
  };

  const set = (k: string, v: string) =>
    setEditing((e) => {
      if (!e) return e;
      const form = { ...e.form, [k]: v };
      return { ...e, form: p.onChange ? p.onChange(form, k) : form };
    });

  return (
    <div>
      <PageHeader
        title={p.title}
        action={
          <Button variant="lime" size="lg" className="rounded-full" onClick={openNew}>
            <Plus className="h-4 w-4" /> New {p.singular.toLowerCase()}
          </Button>
        }
      />
      {p.banner}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${p.title.toLowerCase()}…`} className="h-10 rounded-full bg-card pl-10" />
        </div>
        {p.filter && (
          <div className="flex flex-wrap gap-2">
            {[{ value: "all", label: "All" }, ...p.filter.options].map((o) => (
              <button
                key={o.value}
                onClick={() => setFv(o.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${fv === o.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
        {/* desktop table */}
        <table className="hidden w-full text-sm md:table">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              {p.columns.map((c) => (
                <th key={c.label} className={`px-5 py-3 font-semibold ${c.className ?? ""}`}>{c.label}</th>
              ))}
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={String(r[p.idKey])} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
                {p.columns.map((c) => (
                  <td key={c.label} className={`px-5 py-3.5 ${c.className ?? ""}`}>{c.render(r)}</td>
                ))}
                <td className="px-5 py-3.5">
                  <RowActions onEdit={() => openEdit(r)} onDelete={() => del(r)} extra={p.extraActions?.(r)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* mobile cards */}
        <div className="divide-y divide-border md:hidden">
          {visible.map((r) => (
            <div key={String(r[p.idKey])} className="space-y-2 p-4">
              {p.columns.map((c) => (
                <div key={c.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="shrink-0 text-muted-foreground">{c.label}</span>
                  <span className="min-w-0 truncate text-right font-medium">{c.render(r)}</span>
                </div>
              ))}
              <RowActions onEdit={() => openEdit(r)} onDelete={() => del(r)} extra={p.extraActions?.(r)} />
            </div>
          ))}
        </div>
        {visible.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">Nothing found.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Edit ${p.singular.toLowerCase()} #${editing.id}` : `New ${p.singular.toLowerCase()}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {p.fields.map((f) => (
              <div key={f.key} className="grid gap-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                {f.type === "select" ? (
                  <select id={f.key} className={selectCls} value={editing?.form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                    <option value="">Select…</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input id={f.key} type={f.type ?? "text"} step={f.step} min={f.type === "number" ? 0 : undefined} maxLength={120} className="rounded-full" value={editing?.form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="lime" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowActions({ onEdit, onDelete, extra }: { onEdit: () => void; onDelete: () => void; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {extra}
      <Button size="icon" variant="ghost" className="rounded-full" onClick={onEdit} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={onDelete} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warning" | "success" | "info" | "destructive" | "accent" }) {
  const t = {
    muted: "bg-muted text-muted-foreground",
    warning: "bg-warning text-warning-foreground",
    success: "bg-success text-success-foreground",
    info: "bg-info text-info-foreground",
    destructive: "bg-destructive/10 text-destructive",
    accent: "bg-accent text-accent-foreground",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${t}`}>{children}</span>;
}

export const statusTone = { New: "info", Processing: "warning", Paid: "success", Cancelled: "destructive", Refunded: "muted" } as const;
