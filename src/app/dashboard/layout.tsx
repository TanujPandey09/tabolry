import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ACTIVE_RESTAURANT_COOKIE, getAuthenticatedUser } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";

const OWNER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/dashboard/orders", label: "Live Orders", icon: "ShoppingBag" },
  { href: "/dashboard/profile", label: "Restaurant Profile", icon: "Store" },
  { href: "/dashboard/categories", label: "Menu Categories", icon: "FolderTree" },
  { href: "/dashboard/menu", label: "Menu Management", icon: "UtensilsCrossed" },
  { href: "/dashboard/tables", label: "Tables & QR Codes", icon: "Table2" },
  { href: "/dashboard/appearance", label: "Menu Appearance", icon: "Palette" },
  { href: "/dashboard/analytics", label: "Scan Analytics", icon: "BarChart3" },
  { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const memberships = await prisma.restaurantMembership.findMany({
    where: { userId: user.id },
    include: {
      restaurant: { select: { id: true, name: true, slug: true, isPublished: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    if (user.role === "SUPER_ADMIN") {
      redirect("/admin");
    }
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value;
  const membership =
    (preferredId
      ? memberships.find((m) => m.restaurantId === preferredId)
      : undefined) ?? memberships[0];

  return (
    <DashboardShell
      brandTitle={membership.restaurant.name}
      brandBadge="Restaurant"
      navItems={OWNER_NAV}
      userName={user.name}
      userEmail={user.email}
      publicMenuUrl={`/menu/${membership.restaurant.slug}`}
    >
      {children}
    </DashboardShell>
  );
}
