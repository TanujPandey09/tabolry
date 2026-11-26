"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabloryLogo } from "@/components/ui/tablory-logo";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const toastId = toast.loading("Creating your restaurant account...");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Registration failed.";
        setError(msg);
        toast.error("Registration failed", {
          id: toastId,
          description: msg,
        });
        setLoading(false);
        return;
      }

      toast.loading("Preparing your restaurant dashboard...", { id: toastId });

      const signInRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        toast.success("Account created successfully!", {
          id: toastId,
          description: "Please sign in with your new email and password.",
        });
        router.push("/login");
        return;
      }

      toast.success("Welcome to Tablory!", {
        id: toastId,
        description: "Your 14-day trial is ready. Let's set up your restaurant.",
      });
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      toast.error("Registration error", {
        id: toastId,
        description: "Unable to complete signup. Please verify your connection.",
      });
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] px-4 py-12">
      {/* Ambient warm glow */}
      <div className="absolute top-1/4 h-72 w-72 rounded-full bg-gradient-to-tr from-[#E15A2B]/10 to-amber-500/10 blur-3xl pointer-events-none" />

      <Link href="/" className="mb-6 flex items-center z-10">
        <TabloryLogo size="lg" />
      </Link>

      <Card className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white shadow-xl shadow-stone-200/40 z-10 p-1 sm:p-2">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Start your 14-day free trial</CardTitle>
          <CardDescription>
            Create your restaurant owner account — no credit card required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Your full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. Amit Verma"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#18181B] hover:bg-stone-800 text-white font-bold h-11 rounded-xl shadow-sm transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-[#E15A2B]" />
                  <span>Setting up account...</span>
                </>
              ) : (
                "Start 14-Day Free Trial"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#E15A2B] hover:text-[#C2410C]">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
