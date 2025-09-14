import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

// Same schema as create-buyer
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

    const body = await req.json();
    const { id, updatedAt, ...fields } = body;
    const parsed = BuyerSchema.parse(fields);

    // Fetch existing buyer
    const { data: buyer } = await supabase
      .from("buyers")
      .select("*")
      .eq("id", id)
      .single();
    if (!buyer) return new Response("Not found", { status: 404 });

    // ✅ Ownership check
    if (buyer.ownerId !== user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    // ✅ Concurrency check
    if (buyer.updatedAt !== updatedAt) {
      return new Response("Record changed, please refresh", { status: 409 });
    }

    // ✅ Rate limit check (10 updates/hour)
    const { data: limits } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", user.id)
      .eq("action", "update_buyer")
      .gte("window_start", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .single();

    if (limits && limits.count >= 10) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    // Perform update
    const { data, error } = await supabase
      .from("buyers")
      .update({ ...parsed, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    // Write history
    const diff = {};
    for (const key of Object.keys(parsed)) {
      if (buyer[key] !== parsed[key]) {
        diff[key] = { old: buyer[key], new: parsed[key] };
      }
    }

    await supabase.from("buyer_history").insert({
      buyerId: id,
      changedBy: user.id,
      changedAt: new Date().toISOString(),
      diff,
    });

    // Update rate limit counter
    if (limits) {
      await supabase
        .from("rate_limits")
        .update({ count: limits.count + 1 })
        .eq("id", limits.id);
    } else {
      await supabase.from("rate_limits").insert({
        user_id: user.id,
        action: "update_buyer",
        count: 1,
      });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 400 });
  }
});
