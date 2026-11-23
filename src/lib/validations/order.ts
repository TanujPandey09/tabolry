import { z } from "zod";

export const createOrderSchema = z.object({
  restaurantSlug: z.string().min(1, "Restaurant slug is required"),
  tableToken: z.string().optional().nullable(),
  customerName: z.string().max(100).optional().nullable(),
  customerPhone: z.string().max(20).optional().nullable(),
  paymentMethod: z
    .enum(["CASH_AT_COUNTER", "UPI_ONLINE", "CARD"])
    .default("CASH_AT_COUNTER"),
  notes: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, "Item ID is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1").max(50),
        notes: z.string().max(200).optional().nullable(),
      })
    )
    .min(1, "At least one item must be ordered"),
});

export const updateOrderStatusSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "PREPARING", "SERVED", "COMPLETED", "CANCELLED"])
    .optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "REFUNDED"]).optional(),
  paymentMethod: z.enum(["CASH_AT_COUNTER", "UPI_ONLINE", "CARD"]).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
