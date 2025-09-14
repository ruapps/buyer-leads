import { describe, it, expect } from "vitest";
import { createBuyerSchema } from "../src/lib/zodSchemas.js";

// Helper to test validation
function validate(input) {
  return createBuyerSchema.safeParse(input);
}

describe("Buyer validation (budget rules)", () => {
  const base = {
    fullName: "John Doe",
    phone: "9876543210",
    city: "Chandigarh",
    propertyType: "Apartment",
    bhk: "2",
    purpose: "Buy",
    timeline: "0-3m",
    source: "Website",
  };

  it("should reject when budgetMax < budgetMin", () => {
    const result = validate({ ...base, budgetMin: 500000, budgetMax: 400000 });
    expect(result.success).toBe(false);
  });

  it("should allow when budgetMax == budgetMin", () => {
    const result = validate({ ...base, budgetMin: 500000, budgetMax: 500000 });
    expect(result.success).toBe(true);
  });

  it("should allow when budgetMax > budgetMin", () => {
    const result = validate({ ...base, budgetMin: 500000, budgetMax: 600000 });
    expect(result.success).toBe(true);
  });
});
