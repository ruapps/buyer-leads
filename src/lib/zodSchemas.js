import { z } from "zod";

// Define enums for dropdown fields
const cities = ["Chandigarh", "Mohali", "Zirakpur", "Panchkula", "Other"];
const propertyTypes = ["Apartment", "Villa", "Plot", "Office", "Retail"];
const bhkValues = ["1", "2", "3", "4", "Studio"];
const purposeValues = ["Buy", "Rent"];
const timelineValues = ["0-3m", "3-6m", ">6m", "Exploring"];
const sourceValues = ["Website", "Referral", "Walk-in", "Call", "Other"];
const statusValues = [
  "New",
  "Qualified",
  "Contacted",
  "Visited",
  "Negotiation",
  "Converted",
  "Dropped",
];

// Base schema for buyer
export const buyerBase = z
  .object({
    fullName: z.string().min(2).max(80), // must be 2–80 chars
    email: z.string().email().optional().or(z.literal("")), // valid email if provided
    phone: z.string().regex(/^[0-9]{10,15}$/), // 10–15 digits only
    city: z.enum(cities),
    propertyType: z.enum(propertyTypes),
    bhk: z.union([z.enum(bhkValues), z.literal("")]).optional(), // required later if Apartment/Villa
    purpose: z.enum(purposeValues),
    budgetMin: z.union([z.number().int().positive(), z.literal("")]).optional(),
    budgetMax: z.union([z.number().int().positive(), z.literal("")]).optional(),
    timeline: z.enum(timelineValues),
    source: z.enum(sourceValues),
    notes: z.string().max(1000).optional().or(z.literal("")),
    tags: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    // Custom rule: BHK is required if Apartment or Villa
    if (["Apartment", "Villa"].includes(data.propertyType) && !data.bhk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BHK required for Apartment or Villa",
        path: ["bhk"],
      });
    }
    // Custom rule: budgetMax must be >= budgetMin
    const min = typeof data.budgetMin === "number" ? data.budgetMin : null;
    const max = typeof data.budgetMax === "number" ? data.budgetMax : null;
    if (min != null && max != null && max < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "budgetMax must be >= budgetMin",
        path: ["budgetMax"],
      });
    }
  });

// For create new buyer
export const createBuyerSchema = buyerBase.extend({
  status: z.enum(statusValues).optional(),
});

// For update buyer
export const updateBuyerSchema = createBuyerSchema.partial().extend({
  id: z.string().uuid(),
  updatedAt: z.string(),
});
