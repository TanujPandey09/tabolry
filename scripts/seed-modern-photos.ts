import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PHOTO_CATALOG: Record<string, string> = {
  // Starters
  "Paneer Tikka":
    "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80",
  "Paneer Tikka Angara":
    "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80",
  "Tandoori Chicken (Half)":
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80",
  "Chicken Malai Tikka":
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80",
  "Crispy Chilli Potato":
    "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",

  // Main Course
  "Dal Makhani":
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
  "Dal Makhani Handi":
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
  "Kadhai Paneer":
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
  "Shahi Paneer":
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
  "Butter Chicken":
    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80",

  // Beverages
  "Punjabi Sweet Lassi":
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80",
  "Fresh Lime Soda":
    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
  "Secret Cold Brew":
    "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",

  // Desserts
  "Warm Gulab Jamun (2 pcs)":
    "https://images.unsplash.com/photo-1666190094762-221118d524c2?auto=format&fit=crop&w=800&q=80",
  "Seasonal Gulab Jamun":
    "https://images.unsplash.com/photo-1666190094762-221118d524c2?auto=format&fit=crop&w=800&q=80",
  "A Special":
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
  "Injected Dish":
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
};

const RESTAURANT_COVER =
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=80";

const RESTAURANT_LOGO =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80";

async function run() {
  console.log("Updating restaurant branding and food photography with open-source Pexels/Unsplash assets...");

  // 1. Update Spice Garden Demo
  const demo = await prisma.restaurant.findUnique({
    where: { slug: "spice-garden-demo" },
    include: { menuItems: true },
  });

  if (demo) {
    await prisma.restaurant.update({
      where: { id: demo.id },
      data: {
        coverImageUrl: RESTAURANT_COVER,
        logoUrl: RESTAURANT_LOGO,
        primaryColor: "#E15A2B",
      },
    });
    console.log("✓ Updated Spice Garden Demo branding & cover image.");

    for (const item of demo.menuItems) {
      const url = PHOTO_CATALOG[item.name];
      if (url) {
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { imageUrl: url },
        });
        console.log(`  ✓ Added photo for ${item.name}`);
      }
    }
  }

  // 2. Update all other items across database
  const allItems = await prisma.menuItem.findMany();
  let updatedCount = 0;
  for (const item of allItems) {
    const photo = PHOTO_CATALOG[item.name];
    if (photo && item.imageUrl !== photo) {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: { imageUrl: photo },
      });
      updatedCount++;
    }
  }
  console.log(`✓ Updated ${updatedCount} additional menu item photos across other restaurants.`);

  // 3. Update covers for any other restaurants missing them
  const allRestaurants = await prisma.restaurant.findMany({
    where: { OR: [{ coverImageUrl: null }, { coverImageUrl: { contains: "branding-" } }] },
  });
  for (const r of allRestaurants) {
    await prisma.restaurant.update({
      where: { id: r.id },
      data: {
        coverImageUrl: RESTAURANT_COVER,
        logoUrl: RESTAURANT_LOGO,
      },
    });
  }
  console.log(`✓ Updated covers/logos for ${allRestaurants.length} restaurants.`);

  console.log("All restaurant menus now have rich, mouthwatering food photography!");
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
