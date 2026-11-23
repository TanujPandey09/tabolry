import {
  PrismaClient,
  DietaryType,
  MenuTemplate,
  QRCodeType,
  SubscriptionStatus,
  BillingCycle,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateToken() {
  return crypto.randomBytes(16).toString("base64url");
}

const DEMO_COVER_IMAGE =
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=80";

const DEMO_LOGO_IMAGE =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80";

const DEMO_ITEM_IMAGES: Record<string, string> = {
  "Paneer Tikka":
    "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80",
  "Tandoori Chicken (Half)":
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=600&q=80",
  "Crispy Chilli Potato":
    "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=600&q=80",
  "Dal Makhani":
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
  "Kadhai Paneer":
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
  "Butter Chicken":
    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80",
  "Punjabi Sweet Lassi":
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=600&q=80",
  "Fresh Lime Soda":
    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
  "Warm Gulab Jamun (2 pcs)":
    "https://images.unsplash.com/photo-1666190094762-221118d524c2?auto=format&fit=crop&w=600&q=80",
};

async function main() {
  console.log("Seeding MenuQR database...");

  // 1. Seed Subscription Plans (experimental launch pricing in INR)
  const plans = [
    {
      code: "FREE_TRIAL",
      name: "Free Trial",
      description: "14-day full-featured free trial for pilot restaurants.",
      monthlyPrice: 0,
      yearlyPrice: 0,
      currency: "INR",
      trialDays: 14,
      maxRestaurants: 1,
      maxTables: 15,
      maxMenuItems: 100,
      sortOrder: 1,
      features: [
        "14 days free trial",
        "1 restaurant location",
        "Menu & category management",
        "General & table QR codes",
        "Mobile-first digital menu",
      ],
    },
    {
      code: "STARTER",
      name: "Starter",
      description: "Essential digital menu and QR codes for local eateries and cafes.",
      monthlyPrice: 199,
      yearlyPrice: 1990,
      currency: "INR",
      trialDays: 14,
      maxRestaurants: 1,
      maxTables: 15,
      maxMenuItems: 150,
      sortOrder: 2,
      features: [
        "1 restaurant location",
        "Unlimited menu updates",
        "Up to 15 table QR codes",
        "PNG & printable PDF exports",
        "Basic brand customization",
      ],
    },
    {
      code: "GROWTH",
      name: "Growth",
      description: "Complete branding, analytics, and multi-table QR suite for busy restaurants.",
      monthlyPrice: 399,
      yearlyPrice: 3990,
      currency: "INR",
      trialDays: 14,
      maxRestaurants: 1,
      maxTables: 50,
      maxMenuItems: 500,
      sortOrder: 3,
      features: [
        "1 restaurant location",
        "All 3 premium menu templates",
        "Up to 50 table QR codes + bulk PDF",
        "Real-time QR scan analytics",
        "Priority Meerut pilot support",
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.currency,
        trialDays: plan.trialDays,
        maxRestaurants: plan.maxRestaurants,
        maxTables: plan.maxTables,
        maxMenuItems: plan.maxMenuItems,
        sortOrder: plan.sortOrder,
        features: plan.features,
      },
      create: plan,
    });
  }

  const freeTrialPlan = await prisma.subscriptionPlan.findUniqueOrThrow({
    where: { code: "FREE_TRIAL" },
  });

  // 2. Seed Super Admin account
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@menuqr.in";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Platform Super Admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  // 3. Seed Demo Restaurant Owner & Demo Restaurant (clearly labeled DEMO)
  const demoOwnerEmail = "demo@spicegarden.in";
  const demoOwnerPasswordHash = await bcrypt.hash("Demo@12345", 12);

  const demoOwner = await prisma.user.upsert({
    where: { email: demoOwnerEmail },
    update: {},
    create: {
      name: "Rajesh Sharma (Demo Owner)",
      email: demoOwnerEmail,
      passwordHash: demoOwnerPasswordHash,
      role: "RESTAURANT_OWNER",
      isActive: true,
    },
  });

  const existingRestaurant = await prisma.restaurant.findUnique({
    where: { slug: "spice-garden-demo" },
  });

  if (!existingRestaurant) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const restaurant = await prisma.restaurant.create({
      data: {
        name: "Spice Garden Family Restaurant (Demo)",
        slug: "spice-garden-demo",
        logoUrl: DEMO_LOGO_IMAGE,
        coverImageUrl: DEMO_COVER_IMAGE,
        description:
          "Authentic North Indian curries, tandoor delicacies, and fresh Indian breads served warm in the heart of Meerut.",
        phone: "+91 98100 00001",
        address: "14 Abu Lane, Near Sadar Bazaar",
        city: "Meerut",
        state: "Uttar Pradesh",
        country: "India",
        currency: "INR",
        primaryColor: "#E15A2B",
        template: MenuTemplate.MODERN,
        status: "ACTIVE",
        isPublished: true,
        onboardingCompleted: true,
        onboardingStep: 5,
        memberships: {
          create: {
            userId: demoOwner.id,
            role: "OWNER",
          },
        },
        subscription: {
          create: {
            planId: freeTrialPlan.id,
            billingCycle: BillingCycle.TRIAL,
            status: SubscriptionStatus.TRIALING,
            trialEndsAt,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndsAt,
            notes: "Demo seeded pilot restaurant",
          },
        },
      },
    });

    await prisma.qRCode.create({
      data: {
        restaurantId: restaurant.id,
        type: QRCodeType.GENERAL,
        token: generateToken(),
        isActive: true,
      },
    });

    const categoriesData = [
      {
        name: "Starters",
        description: "Fresh tandoor & crispy appetizers",
        displayOrder: 1,
        items: [
          {
            name: "Paneer Tikka",
            description:
              "Char-grilled cottage cheese marinated in spiced hung curd and bell peppers.",
            price: 260,
            dietaryType: DietaryType.VEG,
            isAvailable: true,
            displayOrder: 1,
          },
          {
            name: "Tandoori Chicken (Half)",
            description:
              "Classic clay-oven roasted chicken infused with Kashmiri chilli and lemon.",
            price: 320,
            dietaryType: DietaryType.NON_VEG,
            isAvailable: true,
            displayOrder: 2,
          },
          {
            name: "Crispy Chilli Potato",
            description:
              "Wok-tossed golden potato fingers glazed with sesame and sweet chilli.",
            price: 180,
            dietaryType: DietaryType.VEG,
            isAvailable: false,
            displayOrder: 3,
          },
        ],
      },
      {
        name: "Main Course",
        description: "Rich curries, dals, and fragrant rice",
        displayOrder: 2,
        items: [
          {
            name: "Dal Makhani",
            description: "Slow-simmered black lentils finished with white butter and cream.",
            price: 240,
            dietaryType: DietaryType.VEG,
            isAvailable: true,
            displayOrder: 1,
          },
          {
            name: "Kadhai Paneer",
            description:
              "Cottage cheese cubes tossed with crushed coriander, onions, and capsicum.",
            price: 280,
            dietaryType: DietaryType.VEG,
            isAvailable: true,
            displayOrder: 2,
          },
          {
            name: "Butter Chicken",
            description:
              "Tender tandoori chicken simmered in a velvety tomato-cashew makhani gravy.",
            price: 350,
            dietaryType: DietaryType.NON_VEG,
            isAvailable: true,
            displayOrder: 3,
          },
        ],
      },
      {
        name: "Beverages",
        description: "Cooling lassi, masala chai, and mocktails",
        displayOrder: 3,
        items: [
          {
            name: "Punjabi Sweet Lassi",
            description: "Thick churned yogurt topped with cardamom and crushed pistachios.",
            price: 90,
            dietaryType: DietaryType.VEG,
            isAvailable: true,
            displayOrder: 1,
          },
          {
            name: "Fresh Lime Soda",
            description: "Chilled sparkling lemon refresher — sweet, salted, or mixed.",
            price: 70,
            dietaryType: DietaryType.VEG,
            isAvailable: true,
            displayOrder: 2,
          },
        ],
      },
      {
        name: "Desserts",
        description: "Traditional Indian sweets",
        displayOrder: 4,
        items: [
          {
            name: "Warm Gulab Jamun (2 pcs)",
            description: "Soft khoya dumplings steeped in saffron-cardamom sugar syrup.",
            price: 110,
            dietaryType: DietaryType.VEG,
            isAvailable: true,
            displayOrder: 1,
          },
        ],
      },
    ];

    for (const cat of categoriesData) {
      const createdCat = await prisma.category.create({
        data: {
          restaurantId: restaurant.id,
          name: cat.name,
          description: cat.description,
          displayOrder: cat.displayOrder,
        },
      });

      for (const item of cat.items) {
        await prisma.menuItem.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: createdCat.id,
            name: item.name,
            description: item.description,
            imageUrl: DEMO_ITEM_IMAGES[item.name] || null,
            price: item.price,
            dietaryType: item.dietaryType,
            isAvailable: item.isAvailable,
            displayOrder: item.displayOrder,
          },
        });
      }
    }

    for (let i = 1; i <= 5; i++) {
      const table = await prisma.restaurantTable.create({
        data: {
          restaurantId: restaurant.id,
          tableNumber: String(i),
          label: i <= 2 ? "Window Booth" : i === 5 ? "Family Table" : "Main Hall",
          capacity: i === 5 ? 6 : 4,
          isActive: true,
        },
      });

      await prisma.qRCode.create({
        data: {
          restaurantId: restaurant.id,
          tableId: table.id,
          type: QRCodeType.TABLE,
          token: generateToken(),
          isActive: true,
        },
      });
    }
  } else {
    // Backfill demo cover & dish images if demo restaurant already existed without photos
    if (!existingRestaurant.coverImageUrl) {
      await prisma.restaurant.update({
        where: { id: existingRestaurant.id },
        data: { coverImageUrl: DEMO_COVER_IMAGE },
      });
    }

    const demoItems = await prisma.menuItem.findMany({
      where: { restaurantId: existingRestaurant.id, imageUrl: null },
    });
    for (const item of demoItems) {
      const img = DEMO_ITEM_IMAGES[item.name];
      if (img) {
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { imageUrl: img },
        });
      }
    }
  }

  console.log("Seed complete!");
  console.log(`  Super Admin : ${adminEmail} / ${adminPassword}`);
  console.log(`  Demo Owner  : ${demoOwnerEmail} / Demo@12345`);
  console.log("  Demo Menu   : /menu/spice-garden-demo");
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
