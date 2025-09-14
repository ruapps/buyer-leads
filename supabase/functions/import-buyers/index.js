// supabase/functions/import-buyers/index.js
import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

// Server-side Zod schema — keep consistent with client definitions
const buyerSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().regex(/^[0-9]{10,15}$/),
  city: z.enum(["Chandigarh", "Mohali", "Zirakpur", "Panchkula", "Other"]),
  propertyType: z.enum(["Apartment", "Villa", "Plot", "Office", "Retail"]),
  bhk: z
    .union([z.enum(["1", "2", "3", "4", "Studio"]), z.literal("")])
    .optional(),
  purpose: z.enum(["Buy", "Rent"]),
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  timeline: z.enum(["0-3m", "3-6m", ">6m", "Exploring"]),
  source: z.enum(["Website", "Referral", "Walk-in", "Call", "Other"]),
  notes: z.string().max(1000).optional().or(z.literal("")),
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

async function getUserFromHeader(supabase, req) {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer (.+)$/);
  if (!match) return null;
  const token = match[1];
  const userResp = await supabase.auth.getUser(token);
  return userResp?.data?.user || null;
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  try {
    const body = await req.json();
    const rows = body.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "No rows provided" }), {
        status: 400,
      });
    }
    if (rows.length > 200) {
      return new Response(JSON.stringify({ error: "Max 200 rows allowed" }), {
        status: 400,
      });
    }

    // Authenticate user from header
    const user = await getUserFromHeader(supabase, req);
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthenticated" }), {
        status: 401,
      });

    // Validate rows server-side
    const errors = [];
    const prepared = []; // rows mapped to DB columns
    rows.forEach((r, idx) => {
      // Normalize CSV tags: "a;b;c" -> ["a","b","c"]
      if (typeof r.tags === "string") {
        r.tags = r.tags
          .split(";")
          .map((t) => t.trim())
          .filter(Boolean);
      }

      // Normalize keys similar to client
      const normalized = {
        fullName: r.fullName ?? r.full_name ?? "",
        email: r.email ?? "",
        phone: r.phone ?? "",
        city: r.city ?? "",
        propertyType: r.propertyType ?? r.property_type ?? "",
        bhk: r.bhk ?? "",
        purpose: r.purpose ?? "",
        budgetMin:
          r.budgetMin === ""
            ? undefined
            : r.budgetMin != null
            ? Number(r.budgetMin)
            : undefined,
        budgetMax:
          r.budgetMax === ""
            ? undefined
            : r.budgetMax != null
            ? Number(r.budgetMax)
            : undefined,
        timeline: r.timeline ?? "",
        source: r.source ?? "",
        notes: r.notes ?? "",
        tags: r.tags || [],
        status: r.status || "New",
      };

      const parsed = buyerSchema.safeParse(normalized);
      if (!parsed.success) {
        const messages = parsed.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ");
        errors.push({ row: idx + 1, message: messages });
        return;
      }

      // Cross field checks
      const min = parsed.data.budgetMin ?? null;
      const max = parsed.data.budgetMax ?? null;
      if (min != null && max != null && max < min) {
        errors.push({
          row: idx + 1,
          message: "budgetMax must be >= budgetMin",
        });
        return;
      }

      // Map to DB columns
      prepared.push({
        full_name: parsed.data.fullName,
        email: parsed.data.email || null,
        phone: parsed.data.phone,
        city: parsed.data.city,
        property_type: parsed.data.propertyType,
        bhk: parsed.data.bhk || null,
        purpose: parsed.data.purpose,
        budget_min: parsed.data.budgetMin ?? null,
        budget_max: parsed.data.budgetMax ?? null,
        timeline: parsed.data.timeline,
        source: parsed.data.source,
        notes: parsed.data.notes || null,
        tags: parsed.data.tags || [],
        status: parsed.data.status || "New",
        owner_id: user.id,
      });
    });

    if (errors.length > 0) {
      // If any row invalid: return errors and don't insert anything
      return new Response(JSON.stringify({ errors }), { status: 400 });
    }

    // Insert all rows. IMPORTANT: this insert is not fully transactional in this code.
    // For real transactionality, create a Postgres function that does INSERT and buyer_history atomically.
    const { data: inserted, error: insertErr } = await supabase
      .from("buyers")
      .insert(prepared)
      .select();
    if (insertErr)
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
      });

    // Insert matching buyer_history rows
    const historyRows = inserted.map((row) => ({
      buyer_id: row.id,
      changed_by: user.id,
      changed_at: new Date().toISOString(),
      diff: { created: row },
    }));
    const { error: histErr } = await supabase
      .from("buyer_history")
      .insert(historyRows);
    if (histErr) {
      // We consider insertion successful even if history failed; return a warning
      return new Response(
        JSON.stringify({
          inserted: inserted.length,
          warning: "history_insert_failed",
        }),
        { status: 201 }
      );
    }

    return new Response(JSON.stringify({ inserted: inserted.length }), {
      status: 201,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
});
