import { z } from "zod";

export const BOOKING_FIELDS = [
  "sellerName",
  "originCity",
  "destCity",
  "destCountry",
  "destinationType",
  "readyDate",
  "sellerPriority",
  "pallets",
  "cartons",
  "totalDeclaredValue",
  "totalGrossWeight",
  "deliveryAppointment",
] as const;

export const ITEM_FIELDS = [
  "sku",
  "description",
  "hsCode",
  "quantity",
  "unitPrice",
  "unitsPerCarton",
  "cartons",
  "unitWeight",
  "countryOfOrigin",
] as const;

export const editSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set_booking_field"),
    field: z.enum(BOOKING_FIELDS),
    value: z.union([z.string(), z.number(), z.null()]),
  }),
  z.object({
    op: z.literal("adjust_booking_number"),
    field: z.enum(["pallets", "cartons", "totalGrossWeight", "totalDeclaredValue"] as const),
    delta: z.number(),
  }),
  z.object({
    op: z.literal("add_item"),
    sku: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    hsCode: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    unitPrice: z.number().nullable().optional(),
    unitsPerCarton: z.number().nullable().optional(),
    cartons: z.number().nullable().optional(),
    unitWeight: z.number().nullable().optional(),
    countryOfOrigin: z.string().nullable().optional(),
  }),
  z.object({
    op: z.literal("update_item"),
    itemInternalId: z.string(),
    field: z.enum(ITEM_FIELDS),
    value: z.union([z.string(), z.number(), z.null()]),
  }),
  z.object({
    op: z.literal("remove_item"),
    itemInternalId: z.string(),
  }),
  z.object({
    op: z.literal("mark_unknown"),
    target: z.enum(["booking", "item"]),
    itemInternalId: z.string().optional(),
    field: z.string(),
  }),
  z.object({
    op: z.literal("select_carrier"),
    carrier: z.enum(["Carrier A", "Carrier B", "Carrier C"]),
  }),
  z.object({
    op: z.literal("confirm"),
    target: z.string(),
  }),
  z.object({
    op: z.literal("acknowledge"),
    ruleId: z.string(),
  }),
  z.object({
    op: z.literal("clarify"),
    question: z.string(),
  }),
]);

export const llmResponseSchema = z.object({
  edits: z.array(editSchema),
  reply: z.string(),
});

export type Edit = z.infer<typeof editSchema>;
export type LlmResponse = z.infer<typeof llmResponseSchema>;
