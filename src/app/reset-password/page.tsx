"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2 } from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabloryLogo } from "@/components/ui/tablory-logo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid or missing reset link. Please request a new one.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to reset password");
      }

      setDone(true);
      toast.success("Password updated!", {
        description: "You can now sign in with your new password.",
      });
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reset password";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 py-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-stone-900">Password reset complete</p>
          <p className="text-xs text-stone-500">Redirecting you to sign in...</p>
        </div>
        <Button className="w-full" asChild>
          <Link href="/login">Go to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput
          id="confirmPassword"
          placeholder="Re-enter new password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating Password...</span>
          </>
        ) : (
          <>
            <KeyRound className="h-4 w-4" />
            <span>Update Password</span>
          </>
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] px-4 py-12">
      <div className="absolute top-1/4 h-72 w-72 rounded-full bg-gradient-to-tr from-brand/10 to-amber-500/10 blur-3xl pointer-events-none" />

      <Link href="/" className="mb-6 flex items-center z-10">
        <TabloryLogo size="lg" />
      </Link>

      <Card className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white shadow-xl shadow-stone-200/40 z-10 p-1 sm:p-2">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Choose a new password</CardTitle>
          <CardDescription>Enter a strong password for your Tablory account</CardDescription>
        </CardHeader>
        <CardContent>
          <React.Suspense
            fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            }
          >
            <ResetPasswordForm />
          </React.Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
