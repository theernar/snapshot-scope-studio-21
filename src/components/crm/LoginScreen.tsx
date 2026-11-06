import { useState } from "react";
import { Boxes, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSeller } from "@/lib/auth.functions";
import { setSession } from "@/lib/session";

export function LoginScreen() {
  const login = useServerFn(loginSeller);
  const [id, setId] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) return setErr("Enter your Seller ID");
    setBusy(true);
    setErr("");
    try {
      const r = await login({ data: { sellerId: id } });
      if (r.ok) setSession(r.seller);
      else setErr(r.error);
    } catch {
      setErr("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-banner px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-soft">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Boxes className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">Ordo<span className="text-muted-foreground">.crm</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">CRM | ERP Management System</p>
        </div>
        <Label htmlFor="sid">Seller ID</Label>
        <Input id="sid" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. 24B000000" autoFocus autoComplete="username" className="mt-2 h-12 rounded-xl text-base" aria-invalid={!!err} />
        {err && <p role="alert" className="mt-2 text-sm font-medium text-destructive">{err}</p>}
        <Button type="submit" size="lg" disabled={busy} className="mt-6 h-12 w-full rounded-xl text-base">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Войти
        </Button>
      </form>
    </div>
  );
}
