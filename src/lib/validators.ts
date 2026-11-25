import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email address").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(72),
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
});

const hexColorRegex = /^#([0-9A-Fa-f]{6})$/;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, "Restaurant name is required").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug must be at least 2 characters")
    .max(60)
    .regex(slugRegex, "Slug can only contain lowercase letters, numbers, and hyphens"),
  logoUrl: z.string().trim().url().optional().or(z.literal("")).nullable(),
  coverImageUrl: z.string().trim().url().optional().or(z.literal("")).nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(25).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  country: z.string().trim().max(80).default("India"),
  currency: z.string().trim().length(3).default("INR"),
  primaryColor: z
    .string()
    .regex(hexColorRegex, "Must be a valid hex color (e.g. #E15A2B)")
    .default("#E15A2B"),
});

export const updateRestaurantSchema = createRestaurantSchema.partial().extend({
  template: z.enum(["MODERN", "CLASSIC", "MINIMAL"]).optional(),
  isPublished: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
  onboardingStep: z.number().int().min(1).max(5).optional(),
  logoUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://"),
      "Invalid image URL"
    )
    .optional()
    .nullable(),
  coverImageUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://"),
      "Invalid image URL"
    )
    .optional()
    .nullable(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(80),
  description: z.string().trim().max(250).optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(120),
  description: z.string().trim().max(500).optional().nullable(),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://"),
      "Invalid image URL"
    )
    .optional()
    .nullable(),
  price: z.coerce.number().min(0, "Price must be 0 or greater").max(999999),
  categoryId: z.string().min(1).optional().nullable(),
  dietaryType: z.enum(["VEG", "NON_VEG", "EGG"]).default("VEG"),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const createTableSchema = z.object({
  tableNumber: z.string().trim().min(1, "Table number or name is required").max(40),
  label: z.string().trim().max(80).optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(100).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateTableSchema = createTableSchema.partial();

export const adminUpdateRestaurantSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]).optional(),
  isPublished: z.boolean().optional(),
  planId: z.string().min(1).optional(),
  subscriptionStatus: z
    .enum(["TRIALING", "ACTIVE", "EXPIRED", "SUSPENDED", "CANCELLED"])
    .optional(),
  billingCycle: z.enum(["TRIAL", "MONTHLY", "YEARLY"]).optional(),
  trialEndsAt: z.string().datetime().optional().nullable(),
  currentPeriodEnd: z.string().datetime().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const adminPlanSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().nullable(),
  monthlyPrice: z.coerce.number().min(0).max(999999),
  yearlyPrice: z.coerce.number().min(0).max(9999999),
  trialDays: z.coerce.number().int().min(0).max(365),
  maxRestaurants: z.coerce.number().int().min(1).max(100),
  maxTables: z.coerce.number().int().min(1).max(1000),
  maxMenuItems: z.coerce.number().int().min(1).max(10000),
  features: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
});

const hasLetterRegex = /[a-zA-Z\u0900-\u097F]/;
const locationTextRegex = /^[a-zA-Z\s.\-']+$/;
const phoneFormatRegex = /^\+?[0-9\s\-()]{7,20}$/;

export const onboardingRestaurantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Restaurant name must be at least 2 characters")
    .max(100, "Restaurant name is too long")
    .refine((v) => hasLetterRegex.test(v), "Restaurant name must contain letters (not only numbers)"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Menu URL slug must be at least 2 characters")
    .max(60, "Menu URL slug is too long")
    .regex(slugRegex, "Slug can only contain lowercase letters, numbers, and hyphens"),
  phone: z
    .string()
    .trim()
    .regex(phoneFormatRegex, "Enter a valid phone number (digits only, optional + prefix)")
    .refine((v) => {
      const digits = v.replace(/\D/g, "").length;
      return digits >= 10 && digits <= 15;
    }, "Phone number must have 10 to 15 digits"),
  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters")
    .max(80, "City name is too long")
    .regex(locationTextRegex, "City name should contain only letters"),
  state: z
    .string()
    .trim()
    .max(80, "State name is too long")
    .refine((v) => v === "" || locationTextRegex.test(v), "State name should contain only letters")
    .optional(),
  country: z
    .string()
    .trim()
    .min(2, "Country must be at least 2 characters")
    .max(80, "Country name is too long")
    .regex(locationTextRegex, "Country name should contain only letters"),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code (e.g. INR, USD)"),
  primaryColor: z
    .string()
    .trim()
    .regex(hexColorRegex, "Primary color must be a valid hex code (e.g. #E15A2B)"),
});

export const onboardingCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters")
    .max(60, "Category name is too long")
    .refine((v) => hasLetterRegex.test(v), "Category name must contain letters"),
});

export const onboardingMenuItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Dish name must be at least 2 characters")
    .max(100, "Dish name is too long")
    .refine((v) => hasLetterRegex.test(v), "Dish name must contain letters (not only numbers)"),
  price: z.coerce
    .number({ invalid_type_error: "Enter a valid numeric price" })
    .positive("Price must be greater than 0")
    .max(100000, "Price cannot exceed 100,000"),
});

export const onboardingTableSchema = z.object({
  tableNumber: z
    .string()
    .trim()
    .min(1, "Table number is required")
    .max(15, "Table number is too long")
    .regex(/^[a-zA-Z0-9\- ]+$/, "Use only letters, numbers, or hyphens (e.g. 1, A1, T-4)"),
});
