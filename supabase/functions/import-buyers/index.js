import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

// Define Buyer schema
const BuyerSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().optional(),
  phone: z.string().regex(/^[0-9]{10,15}$/),
  city: z.enum(["Chandigarh", "Mohali", "Zirakpur", "Panchkula", "Other"]),
  propertyType: z.enum(["Apartment", "Villa", "Plot", "Office", "Retail"]),
  bhk: z.enum(["1", "2", "3", "4", "Studio"]).optional(),
  purpose: z.enum(["Buy", "Rent"]),
  budgetMin: z.number().int().optional(),
  budgetMax: z.number().int().optional(),
  timeline: z.enum(["0-3m", "3-6m", ">6m", "Exploring"]),
  source: z.enum(["Website", "Referral", "Walk-in", "Call", "Other"]),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  status: z
    .enum([
      "New",
      "Qualified",
      "Contacted",
      "Visited",
      "Negotiation",
      "Converted",
      "Dropped",
    ])
    .optional(),
});

serve(async (req) => {
  try {
    const user = (await supabase.auth.getUser(req)).data.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length > 200) {
      return new Response("Invalid or too many rows", { status: 400 });
    }

    // ✅ Rate limit: max 5 imports/hour
    const { data: limits } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", user.id)
      .eq("action", "import_buyers")
      .gte("window_start", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .single();

    if (limits && limits.count >= 5) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    const valid = [];
    const errors = [];

    rows.forEach((row, idx) => {
      try {
        const parsed = BuyerSchema.parse(row);
        valid.push({ ...parsed, ownerId: user.id });
      } catch (err) {
        errors.push({ row: idx + 1, message: err.message });
      }
    });

    if (valid.length > 0) {
      const { data, error } = await supabase
        .from("buyers")
        .insert(valid)
        .select();
      if (error) throw error;

      // Insert history for all buyers
      const historyEntries = data.map((buyer) => ({
        buyerId: buyer.id,
        changedBy: user.id,
        changedAt: new Date().toISOString(),
        diff: { imported: true },
      }));
      await supabase.from("buyer_history").insert(historyEntries);
    }

    // Update rate limit counter
    if (limits) {
      await supabase
        .from("rate_limits")
        .update({ count: limits.count + 1 })
        .eq("id", limits.id);
    } else {
      await supabase.from("rate_limits").insert({
        user_id: user.id,
        action: "import_buyers",
        count: 1,
      });
    }

    return new Response(JSON.stringify({ inserted: valid.length, errors }), {
      status: 200,
    });
  } catch (err) {
    return new Response(err.message, { status: 400 });
  }
});
