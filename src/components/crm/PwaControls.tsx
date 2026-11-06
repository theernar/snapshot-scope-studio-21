import { useEffect, useState } from "react";
import { Download, Share, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { initializePwa } from "@/lib/pwa";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PwaControls() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    void initializePwa().catch(() => undefined);
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    setIos(!installed && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)));
    const offer = (event: Event) => { event.preventDefault(); if (!installed) setPrompt(event as InstallPrompt); };
    const done = () => { setPrompt(null); setIos(false); };
    const connection = () => { setOffline(!navigator.onLine); };
    connection();
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", done);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    return () => {
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", done);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, []);
  const install = async () => {
    if (!prompt) { setHelp(true); return; }
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };
  return <>
    {offline && <div role="status" className="border-b border-border bg-warning px-4 py-3 text-center text-sm text-warning-foreground"><WifiOff className="mr-2 inline h-4 w-4" />You're offline. Saved pages remain available; reconnect to sign in or change sales.</div>}
    {(prompt || ios) && <div className="flex justify-end border-b border-border bg-background px-4 py-2"><Button variant="lime" onClick={() => void install()}><Download />Install App</Button></div>}
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogHeader><DialogTitle>Install CRM ERP</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Open this site in Safari, tap <Share className="inline h-4 w-4" /> Share, then choose “Add to Home Screen” and “Add”.</p></DialogContent></Dialog>
  </>;
}