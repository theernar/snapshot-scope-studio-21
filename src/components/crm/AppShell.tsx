import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Boxes, Menu, X, RotateCcw, LogOut } from "lucide-react";
import { setSession, useSession } from "@/lib/session";
import { resetDB } from "@/lib/crm-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/customers", label: "Customers" },
  { to: "/employees", label: "Employees" },
  { to: "/products", label: "Products" },
  { to: "/sales", label: "Sales" },
  { to: "/orders", label: "Orders" },
  { to: "/order-items", label: "Order Items" },
  { to: "/defects", label: "Defective Products" },
] as const;

const linkCls = "whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
const activeCls = "bg-primary text-primary-foreground hover:text-primary-foreground";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const reset = () => {
    if (confirm("Reset all data to the sample dataset?")) {
      resetDB();
      toast.success("Sample data restored");
    }
  };
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-4 w-4" />
            </span>
            <span>Ordo<span className="text-muted-foreground">.crm</span></span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft xl:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={linkCls} activeProps={{ className: activeCls }} activeOptions={{ exact: true }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={reset} title="Reset sample data" aria-label="Reset sample data" className="shrink-0 rounded-full">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Link to="/profile" title="My account" className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground" activeProps={{ className: "ring-2 ring-primary" }}>
              {session?.full_name?.[0] ?? "S"}
            </Link>
            <Button variant="outline" size="icon" onClick={() => setSession(null)} title="Log out" aria-label="Log out" className="shrink-0 rounded-full">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setOpen(!open)} className="shrink-0 rounded-full xl:hidden" aria-label="Menu" aria-expanded={open}>
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {open && (
          <nav className="grid grid-cols-2 gap-1 border-t border-border/60 px-4 py-3 xl:hidden">
            {[...NAV, { to: "/profile", label: "My account" } as const].map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className={linkCls + " text-center"} activeProps={{ className: activeCls }} activeOptions={{ exact: true }}>
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {action}
    </div>
  );
}
