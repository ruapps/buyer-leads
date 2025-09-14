import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fetch a buyer with history
export default async function handler(req, res) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return res.json({ error: "Missing id" }, { status: 400 });

  const { data: buyer, error: bErr } = await supabase
    .from("buyers")
    .select("*")
    .eq("id", id)
    .single();

  if (bErr || !buyer)
    return res.json({ error: bErr?.message || "Not found" }, { status: 404 });

  const { data: history, error: hErr } = await supabase
    .from("buyer_history")
    .select("*")
    .eq("buyer_id", id)
    .order("changed_at", { ascending: false })
    .limit(5);

  if (hErr) return res.json({ error: hErr.message }, { status: 400 });

  res.json({
    buyer: {
      id: buyer.id,
      fullName: buyer.full_name,
      email: buyer.email,
      phone: buyer.phone,
      city: buyer.city,
      propertyType: buyer.property_type,
      bhk: buyer.bhk,
      purpose: buyer.purpose,
      budgetMin: buyer.budget_min,
      budgetMax: buyer.budget_max,
      timeline: buyer.timeline,
      source: buyer.source,
      status: buyer.status,
      notes: buyer.notes,
      tags: buyer.tags,
      updatedAt: buyer.updated_at,
    },
    history: history.map((h) => ({
      changedAt: h.changed_at,
      changedBy: h.changed_by,
      diff: h.diff,
    })),
  });
}
