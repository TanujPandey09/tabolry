import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { detectDeviceType, hashIp } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { PublicMenuView } from "@/components/menu/public-menu-view";

export const dynamic = "force-dynamic";

export default async function PublicRestaurantMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      coverImageUrl: true,
      description: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      currency: true,
      primaryColor: true,
      template: true,
      status: true,
      isPublished: true,
    },
  });

  if (!restaurant || restaurant.status !== "ACTIVE" || !restaurant.isPublished) {
    notFound();
  }

  const reqHeaders = await headers();
  const ua = reqHeaders.get("user-agent") || null;
  const ip =
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    reqHeaders.get("x-real-ip") ||
    "127.0.0.1";

  // Fetch categories, uncategorized items, and record QRScanEvent in parallel
  const [categories, uncategorizedItems] = await Promise.all([
    prisma.category.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: {
        menuItems: {
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, categoryId: null },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    (async () => {
      try {
        const generalQr = await prisma.qRCode.findFirst({
          where: { restaurantId: restaurant.id, type: "GENERAL", isActive: true },
          select: { id: true },
        });

        if (generalQr) {
          const rl = checkRateLimit(`scan:${generalQr.id}:${ip}`, 60, 60 * 1000);
          if (rl.allowed) {
            await prisma.qRScanEvent.create({
              data: {
                restaurantId: restaurant.id,
                qrCodeId: generalQr.id,
                tableId: null,
                userAgent: ua ? ua.slice(0, 255) : null,
                deviceType: detectDeviceType(ua),
                ipHash: hashIp(ip),
              },
            });
          }
        }
      } catch {
        // Non-blocking scan event telemetry
      }
    })(),
  ]);

  const formattedCategories = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    menuItems: cat.menuItems.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      imageUrl: i.imageUrl,
      price: Number(i.price),
      dietaryType: i.dietaryType,
      isAvailable: i.isAvailable,
    })),
  }));

  if (uncategorizedItems.length > 0) {
    formattedCategories.push({
      id: "other",
      name: "More Items",
      description: null,
      menuItems: uncategorizedItems.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        imageUrl: i.imageUrl,
        price: Number(i.price),
        dietaryType: i.dietaryType,
        isAvailable: i.isAvailable,
      })),
    });
  }

  return (
    <PublicMenuView
      restaurant={restaurant}
      categories={formattedCategories}
      table={null}
    />
  );
}
