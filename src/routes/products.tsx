import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ImagePlus, PackageX, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/crm/AppShell";
import { Pill, selectCls } from "@/components/crm/EntityPage";
import { useDB, getDB, setDB } from "@/lib/crm-store";
import { isLowStock, LOW_STOCK_THRESHOLD, money, nextId, type Product } from "@/lib/crm-logic";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Products & Inventory — Ordo CRM" },
      { name: "description", content: "Marketplace-style product catalog with images, prices, suppliers and stock tracking." },
      { property: "og:title", content: "Products & Inventory — Ordo CRM" },
      { property: "og:description", content: "Marketplace-style product catalog with images, prices, suppliers and stock tracking." },
    ],
  }),
  component: ProductsPage,
});

type Form = {
  name: string;
  category: string;
  supplier_name: string;
  cost_price: string;
  price: string;
  stock_qty: string;
  image_url: string;
  description: string;
};

const emptyForm: Form = { name: "", category: "", supplier_name: "", cost_price: "", price: "", stock_qty: "", image_url: "", description: "" };

const toForm = (p: Product): Form => ({
  name: p.name,
  category: p.category,
  supplier_name: p.supplier_name,
  cost_price: String(p.cost_price || ""),
  price: String(p.price),
  stock_qty: String(p.stock_qty),
  image_url: p.image_url,
  description: p.description,
});

function ProductsPage() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [stock, setStock] = useState("all");
  const [sort, setSort] = useState("default");
  const [editing, setEditing] = useState<{ id?: number; form: Form } | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cats = useMemo(() => [...new Set(db.products.map((p) => p.category))].sort(), [db.products]);
  const low = db.products.filter(isLowStock);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = db.products.filter((p) => {
      if (needle && !`${p.name} ${p.category} ${p.supplier_name}`.toLowerCase().includes(needle)) return false;
      if (cat !== "all" && p.category !== cat) return false;
      if (stock === "in" && p.stock_qty <= 0) return false;
      if (stock === "low" && !isLowStock(p)) return false;
      if (stock === "out" && p.stock_qty > 0) return false;
      return true;
    });
    if (sort === "asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "desc") return [...list].sort((a, b) => b.price - a.price);
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [db.products, q, cat, stock, sort]);

  const set = (k: keyof Form, v: string) => setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Image is too large — please pick one under 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("image_url", String(reader.result));
    reader.readAsDataURL(f);
  };

  const save = () => {
    if (!editing) return;
    const f = editing.form;
    const fail = (msg: string): void => {
      toast.error(msg);
    };
    if (!f.name.trim()) return fail("Name is required");
    if (!f.category.trim()) return fail("Category is required");
    const price = Number(f.price);
    const cost = f.cost_price === "" ? 0 : Number(f.cost_price);
    const qty = Number(f.stock_qty === "" ? "0" : f.stock_qty);
    if (!(price >= 0)) return fail("Selling price must be 0 or more");
    if (!(cost >= 0)) return fail("Purchase price must be 0 or more");
    if (!Number.isInteger(qty) || qty < 0) return fail("Stock must be a whole number ≥ 0");

    const d = getDB();
    const row = {
      name: f.name.trim(),
      category: f.category.trim(),
      supplier_name: f.supplier_name.trim(),
      cost_price: cost,
      price,
      stock_qty: qty,
      image_url: f.image_url.trim(),
      description: f.description.trim(),
    };
    setDB({
      ...d,
      products: editing.id
        ? d.products.map((p) => (p.product_id === editing.id ? { ...p, ...row } : p))
        : [...d.products, { product_id: nextId(d.products, "product_id"), ...row }],
    });
    toast.success(`Product ${editing.id ? "updated" : "created"}`);
    setEditing(null);
  };

  const del = (p: Product) => {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    const d = getDB();
    if (d.order_items.some((i) => i.product_id === p.product_id)) {
      toast.error("Product is used in orders — remove those items first");
      return;
    }
    setDB({ ...d, products: d.products.filter((x) => x.product_id !== p.product_id) });
    setViewing((v) => (v?.product_id === p.product_id ? null : v));
    toast.success("Product deleted");
  };

  return (
    <div>
      <PageHeader
        title="Products"
        action={
          <Button variant="lime" size="lg" className="rounded-full" onClick={() => setEditing({ form: emptyForm })}>
            <Plus className="h-4 w-4" /> Add product
          </Button>
        }
      />

      {low.length > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-3xl bg-warning px-5 py-4 text-sm text-warning-foreground">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            <b>{low.length} product{low.length > 1 ? "s" : ""}</b> below {LOW_STOCK_THRESHOLD} units:{" "}
            {low.map((p) => p.name).join(", ")}
          </span>
        </div>
      )}

      {/* toolbar */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="h-10 rounded-full bg-card pl-10" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
          <select className={selectCls} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {cats.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className={selectCls} value={stock} onChange={(e) => setStock(e.target.value)} aria-label="Stock">
            <option value="all">Any stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
          <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="default">Default order</option>
            <option value="asc">Price: low to high</option>
            <option value="desc">Price: high to low</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* card grid */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-16 text-center shadow-soft">
          <PackageX className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nothing found. Try changing the search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((p) => (
            <article
              key={p.product_id}
              onClick={() => setViewing(p)}
              className="group cursor-pointer overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImagePlus className="h-10 w-10" />
                  </div>
                )}
                {isLowStock(p) && (
                  <span className="absolute left-3 top-3">
                    <Pill tone="warning"><AlertTriangle className="h-3 w-3" />Low stock</Pill>
                  </span>
                )}
                {p.stock_qty === 0 && (
                  <span className="absolute left-3 top-3">
                    <Pill tone="destructive">Out of stock</Pill>
                  </span>
                )}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow" aria-label="Edit"
                    onClick={(e) => { e.stopPropagation(); setEditing({ id: p.product_id, form: toForm(p) }); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="secondary" className="h-8 w-8 rounded-full text-destructive shadow hover:text-destructive" aria-label="Delete"
                    onClick={(e) => { e.stopPropagation(); del(p); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5 p-4">
                <p className="truncate text-sm font-semibold" title={p.name}>{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
                <div className="flex items-end justify-between gap-2 pt-1">
                  <span className="text-lg font-bold tracking-tight text-primary">{money(p.price)}</span>
                  <span className={`text-xs font-medium ${isLowStock(p) ? "text-warning-foreground" : "text-muted-foreground"}`}>
                    {p.stock_qty} pcs
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* details modal */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
          {viewing && (
            <div className="grid sm:grid-cols-2">
              <div className="relative aspect-square bg-muted">
                {viewing.image_url ? (
                  <img src={viewing.image_url} alt={viewing.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImagePlus className="h-12 w-12" />
                  </div>
                )}
              </div>
              <div className="flex flex-col p-6">
                <DialogHeader className="text-left">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Product Details · Подробнее о товаре</p>
                  <DialogTitle className="text-xl">{viewing.name}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-3 text-sm">
                  <Detail label="Category" value={viewing.category} />
                  <Detail label="Supplier" value={viewing.supplier_name || "—"} />
                  <div className="grid grid-cols-2 gap-3">
                    <Detail label="Selling price" value={money(viewing.price)} strong />
                    <Detail label="Purchase price" value={viewing.cost_price ? money(viewing.cost_price) : "—"} />
                  </div>
                  <Detail
                    label="In stock"
                    value={
                      isLowStock(viewing)
                        ? `${viewing.stock_qty} pcs — low stock`
                        : `${viewing.stock_qty} pcs`
                    }
                  />
                  {viewing.description && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">{viewing.description}</p>
                    </div>
                  )}
                </div>
                <div className="mt-auto flex gap-2 pt-6">
                  <Button
                    variant="lime" className="flex-1 rounded-full"
                    onClick={() => { setEditing({ id: viewing.product_id, form: toForm(viewing) }); setViewing(null); }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button variant="outline" className="rounded-full text-destructive hover:text-destructive" onClick={() => del(viewing)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* add / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Edit product #${editing.id}` : "Add product"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4">
              {/* image */}
              <div className="grid gap-1.5">
                <Label>Product image</Label>
                <div className="flex items-start gap-3">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                    {editing.form.image_url ? (
                      <img src={editing.form.image_url} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImagePlus className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                    />
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => fileRef.current?.click()}>
                      <ImagePlus className="h-4 w-4" /> Upload image
                    </Button>
                    <Input
                      placeholder="…or paste an image URL"
                      value={editing.form.image_url.startsWith("data:") ? "" : editing.form.image_url}
                      onChange={(e) => set("image_url", e.target.value)}
                      className="rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" maxLength={120} className="rounded-full" value={editing.form.name} onChange={(e) => set("name", e.target.value)} />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="p-cat">Category</Label>
                <Input
                  id="p-cat" maxLength={60} className="rounded-full" list="product-cats"
                  value={editing.form.category} onChange={(e) => set("category", e.target.value)}
                />
                <datalist id="product-cats">
                  {cats.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="p-supplier">Supplier / purchase source</Label>
                <Input id="p-supplier" maxLength={120} className="rounded-full" value={editing.form.supplier_name} onChange={(e) => set("supplier_name", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="p-cost">Purchase price (₸)</Label>
                  <Input id="p-cost" type="number" min={0} step="0.01" className="rounded-full" value={editing.form.cost_price} onChange={(e) => set("cost_price", e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="p-price">Selling price (₸)</Label>
                  <Input id="p-price" type="number" min={0} step="0.01" className="rounded-full" value={editing.form.price} onChange={(e) => set("price", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="p-stock">Stock quantity (pcs)</Label>
                <Input id="p-stock" type="number" min={0} step="1" className="rounded-full" value={editing.form.stock_qty} onChange={(e) => set("stock_qty", e.target.value)} />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea id="p-desc" rows={3} maxLength={500} className="rounded-2xl" value={editing.form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="lime" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={strong ? "text-lg font-bold text-primary" : "font-medium"}>{value}</p>
    </div>
  );
}
