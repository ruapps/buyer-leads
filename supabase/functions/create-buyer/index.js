import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

// Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

// Zod schema (same as earlier)
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
});

serve(async (req) => {
  try {
    const user = (await supabase.auth.getUser(req)).data.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    // Parse body
    const body = await req.json();
    const parsed = BuyerSchema.parse(body);

    // ✅ Rate limiting: check if user has exceeded 10 creates in 1 hour
    const { data: limits } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", user.id)
      .eq("action", "create_buyer")
      .gte("window_start", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .single();

    if (limits && limits.count >= 10) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    // Insert buyer
    const { data, error } = await supabase
      .from("buyers")
      .insert({
        ...parsed,
        ownerId: user.id,
      })
      .select()
      .single();
    if (error) throw error;

    // Insert history
    await supabase.from("buyer_history").insert({
      buyerId: data.id,
      changedBy: user.id,
      changedAt: new Date().toISOString(),
      diff: { created: parsed },
    });

    // Update or create rate limit row
    if (limits) {
      await supabase
        .from("rate_limits")
        .update({
          count: limits.count + 1,
        })
        .eq("id", limits.id);
    } else {
      await supabase.from("rate_limits").insert({
        user_id: user.id,
        action: "create_buyer",
        count: 1,
      });
    }

    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err) {
    return new Response(err.message, { status: 400 });
  }
});
