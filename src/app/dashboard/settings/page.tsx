"use client";

import * as React from "react";
import { Check, Loader2, Save, Shield, CreditCard, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { formatCurrency, getTrialDaysRemaining, cn } from "@/lib/utils";

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxTables: number;
  maxMenuItems: number;
  features: string[];
}

export default function SettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [userName, setUserName] = React.useState("");
  const [userEmail, setUserEmail] = React.useState("");
  const [savingAccount, setSavingAccount] = React.useState(false);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);

  const [subscription, setSubscription] = React.useState<{
    status: string;
    billingCycle: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    plan: { id: string; code: string; name: string };
  } | null>(null);
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [billingView, setBillingView] = React.useState<"MONTHLY" | "YEARLY">("MONTHLY");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accRes, restRes] = await Promise.all([
        fetch("/api/account"),
        fetch("/api/restaurants/current"),
      ]);
      const [accJson, restJson] = await Promise.all([accRes.json(), restRes.json()]);
      if (!accRes.ok) throw new Error(accJson.error || "Failed to load account");
      setUserName(accJson.user.name || "");
      setUserEmail(accJson.user.email || "");
      setSubscription(restJson.restaurant?.subscription || null);
      setPlans(
        (restJson.plans || []).map((p: Plan) => ({
          ...p,
          monthlyPrice: Number(p.monthlyPrice),
          yearlyPrice: Number(p.yearlyPrice),
          features: Array.isArray(p.features) ? p.features : [],
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleAccountSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingAccount(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update account");
      toast.success("Account information updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingAccount(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Password update failed");
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <LoadingState message="Loading settings..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const trialDaysLeft = getTrialDaysRemaining(subscription?.trialEndsAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage your owner account, password, and restaurant subscription plan.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your restaurant owner profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccountSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Full name</Label>
                <Input
                  id="acc-name"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-email">Email address</Label>
                <Input id="acc-email" value={userEmail} disabled className="bg-slate-50" />
              </div>
              <Button type="submit" disabled={savingAccount}>
                {savingAccount ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Update Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#E15A2B]" />
              Change Password
            </CardTitle>
            <CardDescription>Use a strong password of at least 8 characters</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cur-pw">Current password</Label>
                <Input
                  id="cur-pw"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-pw">New password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conf-pw">Confirm new password</Label>
                <Input
                  id="conf-pw"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Subscription & Upgrade Plans */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#E15A2B]" />
                Subscription &amp; Plans
              </CardTitle>
              <CardDescription className="mt-1">
                Pilot launch pricing in INR. Plans are activated manually by our onboarding team
                during the pilot phase (no online card charge in MVP).
              </CardDescription>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
              {(["MONTHLY", "YEARLY"] as const).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingView(cycle)}
                  className={cn(
                    "rounded-md px-3 py-1.5 cursor-pointer transition-colors",
                    billingView === cycle
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500"
                  )}
                >
                  {cycle === "MONTHLY" ? "Monthly" : "Yearly (Save ~17%)"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {subscription && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    Current Plan: {subscription.plan.name}
                  </span>
                  <Badge variant={subscription.status === "ACTIVE" ? "success" : "default"}>
                    {subscription.status}
                  </Badge>
                </div>
                {subscription.status === "TRIALING" && subscription.trialEndsAt && (
                  <p className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-[#E15A2B]" />
                    {trialDaysLeft} days remaining · Trial ends on{" "}
                    {new Date(subscription.trialEndsAt).toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>
              <span className="text-xs text-slate-500">
                Need an upgrade? Contact your Meerut pilot coordinator.
              </span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = subscription?.plan.id === plan.id;
              const price =
                billingView === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-5",
                    isCurrent
                      ? "border-[#E15A2B] bg-[#E15A2B]/5 ring-1 ring-[#E15A2B]"
                      : "border-slate-200 bg-white"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                      {isCurrent && <Badge>Current</Badge>}
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-900">
                        {formatCurrency(price, plan.currency)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {plan.code === "FREE_TRIAL"
                          ? "/ 14 days"
                          : billingView === "YEARLY"
                            ? "/ year"
                            : "/ month"}
                      </span>
                    </div>
                    {plan.description && (
                      <p className="mt-2 text-xs text-slate-500">{plan.description}</p>
                    )}

                    <ul className="mt-4 space-y-2 text-xs text-slate-700">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 shrink-0 text-[#E15A2B]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5">
                    {isCurrent ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        Active Plan
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          toast.info(
                            `To switch to ${plan.name}, please contact Tablory pilot support. Online payments are not enabled in this MVP.`
                          )
                        }
                      >
                        Request {plan.name} Plan
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
