import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { detectDeviceType, hashIp } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { PublicMenuView } from "@/components/menu/public-menu-view";

export const dynamic = "force-dynamic";

export default async function PublicTableMenuPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

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
      whatsappNumber: true,
      upiId: true,
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

  const qrCode = await prisma.qRCode.findFirst({
    where: {
      restaurantId: restaurant.id,
      token,
      type: "TABLE",
      isActive: true,
    },
    include: {
      table: {
        select: { id: true, tableNumber: true, label: true, isActive: true },
      },
    },
  });

  if (!qrCode || !qrCode.table || !qrCode.table.isActive) {
    notFound();
  }

  const activeTable = qrCode.table;
  const qrCodeId = qrCode.id;

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
        const rl = checkRateLimit(`scan:${qrCodeId}:${ip}`, 60, 60 * 1000);
        if (rl.allowed) {
          await prisma.qRScanEvent.create({
            data: {
              restaurantId: restaurant.id,
              qrCodeId: qrCodeId,
              tableId: activeTable.id,
              userAgent: ua ? ua.slice(0, 255) : null,
              deviceType: detectDeviceType(ua),
              ipHash: hashIp(ip),
            },
          });
        }
      } catch {
        // Non-blocking telemetry
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
      table={{
        id: qrCode.table.id,
        tableNumber: qrCode.table.tableNumber,
        label: qrCode.table.label,
        token: qrCode.token,
      }}
    />
  );
}
