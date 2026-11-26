"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabloryLogo } from "@/components/ui/tablory-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to send reset link");
      }

      setSubmitted(true);
      toast.success("Reset link sent", {
        description: "Check your inbox for password reset instructions.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] px-4 py-12">
      <div className="absolute top-1/4 h-72 w-72 rounded-full bg-gradient-to-tr from-brand/10 to-amber-500/10 blur-3xl pointer-events-none" />

      <Link href="/" className="mb-6 flex items-center z-10">
        <TabloryLogo size="lg" />
      </Link>

      <Card className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white shadow-xl shadow-stone-200/40 z-10 p-1 sm:p-2">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your account email and we&apos;ll send you a 15-minute reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-5 py-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-stone-900">Check your email</p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  If an account exists for <strong className="text-stone-700">{email}</strong>, we&apos;ve sent a password reset link that expires in 15 minutes.
                </p>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="owner@restaurant.in"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-bold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </Button>

              <p className="pt-2 text-center text-sm text-stone-600">
                Remember your password?{" "}
                <Link href="/login" className="font-semibold text-brand hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
