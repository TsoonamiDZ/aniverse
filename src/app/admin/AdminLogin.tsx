"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error === "wrong_password" ? "كلمة السر غير صحيحة" : "فشل");
      toast.success("تم تسجيل الدخول — مرحبًا بك في أداة التحديث");
      router.refresh(); // re-render the server component → shows AdminTool
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grad-primary/5 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl backdrop-blur">
        <div className="bg-grad-primary px-6 py-8 text-center text-primary-foreground">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/15">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black">أداة تحديث المكتبة</h1>
          <p className="mt-1 text-sm text-primary-foreground/80">
            واجهة إدارية محمية — للصاحب فقط
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <KeyRound className="h-4 w-4 text-primary" />
              كلمة السر
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !password}
            className="h-11 w-full bg-grad-primary text-primary-foreground hover:opacity-90"
          >
            <Lock className="h-4 w-4" />
            {loading ? "جارٍ الدخول…" : "دخول"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            هذه الأداة منفصلة عن الموقع العام ولا يصل إليها الزوّار العاديون.
          </p>
        </form>
      </div>
    </div>
  );
}
