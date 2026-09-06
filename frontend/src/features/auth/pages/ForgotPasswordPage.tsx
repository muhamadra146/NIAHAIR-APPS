import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

const schema = z.object({
  email: z.string().email("Format email tidak valid").min(1, "Email wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

async function requestPasswordReset(email: string): Promise<void> {
  await api.post<ApiResponse<null>>("/auth/forgot-password", { email });
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    setApiError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
    }
  };

  if (sent) {
    return (
      <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm text-center">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Email Terkirim!</h2>
          <p className="text-sm text-muted-foreground">
            Jika email <strong>{getValues("email")}</strong> terdaftar di sistem,
            kami telah mengirimkan link untuk reset password.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Link berlaku selama <strong>1 jam</strong>. Periksa folder Spam jika tidak muncul.
          </p>
        </div>
        <Link to="/login">
          <Button variant="outline" className="w-full gap-2">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="space-y-1 text-center mb-2">
        <div className="flex justify-center mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
        </div>
        <h2 className="text-lg font-semibold">Lupa Password?</h2>
        <p className="text-sm text-muted-foreground">
          Masukkan email akunmu. Kami akan kirimkan link reset password.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@niahair.com"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      {apiError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {apiError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Mengirim..." : "Kirim Link Reset"}
      </Button>

      <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali ke Login
      </Link>
    </form>
  );
}
