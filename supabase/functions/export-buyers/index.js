import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const city = url.searchParams.get("city") || null;
  const propertyType = url.searchParams.get("propertyType") || null;
  const status = url.searchParams.get("status") || null;

  let query = supabase.from("buyers").select("*");

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    );
  }
  if (city) query = query.eq("city", city);
  if (propertyType) query = query.eq("property_type", propertyType);
  if (status) query = query.eq("status", status);

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(10000); // safeguard
  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });

  // Select columns in a stable order matching CSV header spec
  const headers = [
    "fullName",
    "email",
    "phone",
    "city",
    "propertyType",
    "bhk",
    "purpose",
    "budgetMin",
    "budgetMax",
    "timeline",
    "source",
    "notes",
    "tags",
    "status",
    "ownerId",
    "updatedAt",
  ];
  const rows = data.map((r) => {
    return [
      (r.full_name ?? "").replace(/"/g, '""'),
      (r.email ?? "").replace(/"/g, '""'),
      (r.phone ?? "").replace(/"/g, '""'),
      (r.city ?? "").replace(/"/g, '""'),
      (r.property_type ?? "").replace(/"/g, '""'),
      (r.bhk ?? "").replace(/"/g, '""'),
      (r.purpose ?? "").replace(/"/g, '""'),
      r.budget_min ?? "",
      r.budget_max ?? "",
      (r.timeline ?? "").replace(/"/g, '""'),
      (r.source ?? "").replace(/"/g, '""'),
      (r.notes ?? "").replace(/"/g, '""'),
      // tags as semicolon-separated string
      (Array.isArray(r.tags) ? r.tags.join(";") : r.tags ?? "").replace(
        /"/g,
        '""'
      ),
      (r.status ?? "").replace(/"/g, '""'),
      r.owner_id ?? "",
      r.updated_at ? new Date(r.updated_at).toISOString() : "",
    ]
      .map((cell) => `"${cell}"`)
      .join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv" } });
});
