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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const toastId = toast.loading("Verifying your credentials...");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please verify your credentials.");
        toast.error("Sign in failed", {
          id: toastId,
          description: "The email or password you entered is incorrect.",
        });
        setLoading(false);
        return;
      }

      toast.success("Welcome back!", {
        id: toastId,
        description: "Redirecting to your restaurant dashboard...",
      });

      // Fetch session to route super admins to /admin and owners to /dashboard
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (session?.user?.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
      toast.error("Connection error", {
        id: toastId,
        description: "Unable to reach the server. Please check your network.",
      });
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[#FAF8F5] px-4 py-8 sm:py-12">
      <Link href="/" className="mb-6 flex items-center">
        <TabloryLogo size="lg" />
      </Link>

      <Card className="w-full max-w-md rounded-2xl border border-stone-200/90 bg-white shadow-sm p-1 sm:p-2">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Sign in to your account</CardTitle>
          <CardDescription>
            Manage your restaurant&apos;s digital menu and table QR codes
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
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
                  <span>Authenticating...</span>
                </>
              ) : (
                "Sign in to Dashboard"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            New to Tablory?{" "}
            <Link href="/register" className="font-semibold text-[#E15A2B] hover:text-[#C2410C]">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
