import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/tenant";
import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Platform Overview", icon: "ShieldCheck" },
  { href: "/admin/restaurants", label: "Restaurants", icon: "Building2" },
  { href: "/admin/plans", label: "Subscription Plans", icon: "CreditCard" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell
      brandTitle="Tablory Admin"
      brandBadge="Super Admin"
      navItems={ADMIN_NAV}
      userName={user.name}
      userEmail={user.email}
      publicMenuUrl={null}
    >
      {children}
    </DashboardShell>
  );
}
