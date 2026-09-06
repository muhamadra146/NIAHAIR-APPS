import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

const schema = z
  .object({
    password:        z.string().min(8, "Password minimal 8 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Password tidak cocok",
    path:    ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

async function doResetPassword(token: string, password: string): Promise<void> {
  await api.post<ApiResponse<null>>("/auth/reset-password", { token, password });
}

export function ResetPasswordPage() {
  const [searchParams]         = useSearchParams();
  const navigate               = useNavigate();
  const [done, setDone]        = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPwd, setShowPwd]  = useState(false);

  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Guard: no token in URL
  if (!token) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm text-center">
        <p className="text-sm text-muted-foreground">
          Link reset password tidak valid atau sudah kadaluarsa.
        </p>
        <Link to="/forgot-password">
          <Button variant="outline" className="w-full">Minta Link Baru</Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm text-center">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Password Berhasil Direset!</h2>
          <p className="text-sm text-muted-foreground">
            Kamu sekarang bisa login menggunakan password baru.
          </p>
        </div>
        <Button className="w-full" onClick={() => navigate("/login", { replace: true })}>
          Login Sekarang
        </Button>
      </div>
    );
  }

  const onSubmit = async ({ password }: FormValues) => {
    setApiError(null);
    try {
      await doResetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="space-y-1 text-center mb-2">
        <div className="flex justify-center mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
        </div>
        <h2 className="text-lg font-semibold">Buat Password Baru</h2>
        <p className="text-sm text-muted-foreground">
          Password baru minimal 8 karakter.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password Baru</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPwd ? "text" : "password"}
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
        <Input
          id="confirmPassword"
          type={showPwd ? "text" : "password"}
          placeholder="Ulangi password baru"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {apiError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {apiError}
          {apiError.toLowerCase().includes("kadaluarsa") && (
            <>
              {" "}
              <Link to="/forgot-password" className="underline">Minta link baru.</Link>
            </>
          )}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Simpan Password Baru"}
      </Button>

      <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali ke Login
      </Link>
    </form>
  );
}
