import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, PackageX, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/crm/AppShell";
import { Pill, selectCls } from "@/components/crm/EntityPage";
import { getDB, setDB, useDB } from "@/lib/crm-store";
import { defectLoss, money, registerDefect, removeDefect, type Defect } from "@/lib/crm-logic";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/defects")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Defective Products — Ordo CRM" },
      { name: "description", content: "Track damaged and unsellable products, removed stock and financial losses." },
      { property: "og:title", content: "Defective Products — Ordo CRM" },
      { property: "og:description", content: "Track damaged and unsellable products, removed stock and financial losses." },
    ],
  }),
  component: DefectsPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function DefectsPage() {
  const db = useDB();
  const session = useSession();
  const [viewing, setViewing] = useState<Defect | null>(null);
  const [form, setForm] = useState<{ product_id: string; quantity: string; reason: string; employee_id: string; reported_date: string } | null>(null);
  const prod = (id: number) => db.products.find((p) => p.product_id === id);
  const emp = (id: number) => db.employees.find((e) => e.employee_id === id)?.full_name ?? `#${id}`;
  const totalLoss = db.defects.reduce((s, d) => s + defectLoss(d), 0);
  const totalQty = db.defects.reduce((s, d) => s + d.quantity, 0);
  const list = [...db.defects].sort((a, b) => b.reported_date.localeCompare(a.reported_date) || b.defect_id - a.defect_id);

  const save = () => {
    if (!form) return;
    const r = registerDefect(getDB(), {
      product_id: Number(form.product_id), quantity: Number(form.quantity), reason: form.reason,
      employee_id: Number(form.employee_id), reported_date: form.reported_date || today(),
    });
    if ("error" in r) return void toast.error(r.error);
    setDB(r.db);
    toast.success("Defective product registered — removed from stock");
    setForm(null);
  };

  const del = (d: Defect) => {
    if (!confirm("Delete this record and return the units to stock?")) return;
    setDB(removeDefect(getDB(), d.defect_id));
    setViewing(null);
    toast.success("Record deleted, stock restored");
  };

  const v = viewing && prod(viewing.product_id);

  return (
    <div>
      <PageHeader
        title="Defective Products"
        action={
          <Button variant="lime" size="lg" className="rounded-full" onClick={() => setForm({ product_id: "", quantity: "1", reason: "", employee_id: String(session?.employee_id ?? ""), reported_date: today() })}>
            <Plus className="h-4 w-4" /> Register defect
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[["Records", db.defects.length], ["Defective units", totalQty], ["Total loss", money(totalLoss)]].map(([k, val]) => (
          <div key={String(k)} className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="text-2xl font-extrabold tracking-tight">{val}</p>
          </div>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-16 text-center shadow-soft">
          <PackageX className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No defective products registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4 2xl:grid-cols-5">
          {list.map((d) => {
            const p = prod(d.product_id);
            return (
              <article key={d.defect_id} onClick={() => setViewing(d)} className="group cursor-pointer overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {p?.image_url ? (
                    <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover grayscale-[40%] transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground"><ImagePlus className="h-10 w-10" /></div>
                  )}
                  <span className="absolute left-3 top-3"><Pill tone="destructive">Defective · {d.quantity} pcs</Pill></span>
                </div>
                <div className="space-y-1.5 p-4">
                  <p className="truncate text-sm font-semibold">{p?.name ?? `Product #${d.product_id}`}</p>
                  <p className="text-xs text-muted-foreground">{p?.category ?? "—"} · cost {money(d.cost_price)}</p>
                  <p className="pt-1 text-lg font-bold tracking-tight text-destructive">−{money(defectLoss(d))}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl overflow-hidden rounded-3xl p-0">
          {viewing && (
            <div className="grid sm:grid-cols-2">
              <div className="aspect-square bg-muted">{v?.image_url && <img src={v.image_url} alt={v.name} className="h-full w-full object-cover" />}</div>
              <div className="flex flex-col gap-3 p-6">
                <DialogHeader><DialogTitle className="text-xl">{v?.name ?? `Product #${viewing.product_id}`}</DialogTitle></DialogHeader>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Quantity</dt><dd className="font-semibold">{viewing.quantity} pcs</dd>
                  <dt className="text-muted-foreground">Purchase price</dt><dd className="font-semibold">{money(viewing.cost_price)}</dd>
                  <dt className="text-muted-foreground">Total loss</dt><dd className="font-bold text-destructive">{money(defectLoss(viewing))}</dd>
                  <dt className="text-muted-foreground">Date reported</dt><dd className="font-semibold">{viewing.reported_date}</dd>
                  <dt className="text-muted-foreground">Registered by</dt><dd className="font-semibold">{emp(viewing.employee_id)}</dd>
                </dl>
                <div>
                  <p className="text-xs text-muted-foreground">Reason for damage</p>
                  <p className="mt-1 rounded-2xl bg-muted p-3 text-sm">{viewing.reason}</p>
                </div>
                <Button variant="outline" className="mt-auto rounded-full text-destructive" onClick={() => del(viewing)}>
                  <Trash2 className="h-4 w-4" /> Delete record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Register defective product</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="d-p">Product</Label>
                <select id="d-p" className={selectCls} value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                  <option value="">Select product…</option>
                  {db.products.map((p) => <option key={p.product_id} value={p.product_id} disabled={p.stock_qty === 0}>{p.name} — {p.stock_qty} in stock</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="d-q">Quantity</Label>
                  <Input id="d-q" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="d-date">Date reported</Label>
                  <Input id="d-date" type="date" value={form.reported_date} onChange={(e) => setForm({ ...form, reported_date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="d-e">Registered by</Label>
                <select id="d-e" className={selectCls} value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                  <option value="">Select employee…</option>
                  {db.employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="d-r">Reason for damage</Label>
                <Textarea id="d-r" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Cracked screen during delivery" />
              </div>
              {form.product_id && Number(form.quantity) > 0 && (
                <p className="text-sm text-muted-foreground">Estimated loss: <b className="text-destructive">{money((prod(Number(form.product_id))?.cost_price ?? 0) * Number(form.quantity))}</b></p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save}>Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
